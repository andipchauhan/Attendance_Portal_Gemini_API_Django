
import io
import xlsxwriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from django.http import HttpResponse
# Attendance report generation (PDF/XLSX)
from .models import User, Attendance
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View

@method_decorator(csrf_exempt, name='dispatch')
class AttendanceReportView(View):
	def get(self, request):
		from .views import get_jwt_user
		user = get_jwt_user(request)
		if not user or user.role != 'Teacher' or not user.is_active or not user.is_approved or not hasattr(user, 'class_assigned'):
			return HttpResponse('Unauthorized', status=401)
		format = request.GET.get('format', 'pdf')
		students = User.objects.filter(class_assigned=user.class_assigned, role='Student').order_by('roll_number')
		output_data = []
		for student in students:
			records = Attendance.objects.filter(student=student).order_by('date')
			total = records.count()
			present = records.filter(status='Present').count()
			percent = round((present/total)*100, 2) if total else 0
			student_info = {
				'name': student.username,
				'class': student.class_assigned,
				'roll': student.roll_number,
				'present': present,
				'total': total,
				'percent': percent,
				'attendance': [
					{'date': r.date.strftime('%Y-%m-%d'), 'status': r.status} for r in records
				]
			}
			output_data.append(student_info)
		if format == 'xlsx':
			output = io.BytesIO()
			workbook = xlsxwriter.Workbook(output)
			worksheet = workbook.add_worksheet('Attendance')
			row = 0
			for student in output_data:
				worksheet.write(row, 0, f"Name: {student['name']}")
				worksheet.write(row, 1, f"Class: {student['class']}")
				worksheet.write(row, 2, f"Roll No: {student['roll']}")
				row += 1
				worksheet.write(row, 0, f"Present: {student['present']} / Total: {student['total']} ({student['percent']}%)")
				row += 1
				worksheet.write(row, 0, "Date")
				worksheet.write(row, 1, "Status")
				row += 1
				for att in student['attendance']:
					worksheet.write(row, 0, att['date'])
					worksheet.write(row, 1, att['status'])
					row += 1
				row += 2  # Space between students
			workbook.close()
			output.seek(0)
			response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
			response['Content-Disposition'] = 'attachment; filename=attendance_report.xlsx'
			return response
		else:
			output = io.BytesIO()
			p = canvas.Canvas(output, pagesize=letter)
			width, height = letter
			y = height - 40
			p.setFont('Helvetica-Bold', 16)
			p.drawString(40, y, f"Attendance Report - Class {user.class_assigned}")
			y -= 30
			for student in output_data:
				p.setFont('Helvetica-Bold', 13)
				p.drawString(40, y, f"Name: {student['name']}   Class: {student['class']}   Roll No: {student['roll']}")
				y -= 20
				p.setFont('Helvetica', 12)
				p.drawString(40, y, f"Present: {student['present']} / Total: {student['total']} ({student['percent']}%)")
				y -= 18
				p.drawString(40, y, "Date")
				p.drawString(140, y, "Status")
				y -= 16
				for att in student['attendance']:
					if y < 60:
						p.showPage()
						y = height - 40
					p.drawString(40, y, att['date'])
					p.drawString(140, y, att['status'])
					y -= 15
				y -= 20  # Space between students
			p.save()
			output.seek(0)
			response = HttpResponse(output.read(), content_type='application/pdf')
			response['Content-Disposition'] = 'attachment; filename=attendance_report.pdf'
			return response
import google.generativeai as genai
import os
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

from dotenv import load_dotenv
load_dotenv()
from .models import GenAIChat
# --- Teacher: Check if attendance is already marked for today ---
@csrf_exempt
def attendance_marked_today_view(request):
	user = get_jwt_user(request)
	if not user or user.role != 'Teacher' or not user.is_active or not user.is_approved:
		return JsonResponse({'error': 'Teacher access required'}, status=403)
	from .models import Attendance, User as UserModel
	today = timezone.now().date()
	# Get all students in teacher's class
	students = UserModel.objects.filter(role='Student', class_assigned=user.class_assigned, is_approved=True)
	# If all students have an attendance record for today, consider marked
	marked_count = Attendance.objects.filter(student__in=students, date=today).count()
	total_students = students.count()
	marked = (total_students > 0 and marked_count == total_students)
	return JsonResponse({'marked': marked})
@csrf_exempt
def genai_chat_dates_view(request):
	user = get_jwt_user(request)
	if not user or user.role != 'Teacher' or not user.is_active or not user.is_approved:
		return JsonResponse({'error': 'Teacher access required'}, status=403)
	# Get all unique dates for which this teacher has chat history
	dates = GenAIChat.objects.filter(teacher=user).order_by('-date').values_list('date', flat=True).distinct()
	date_list = [str(d) for d in dates]
	return JsonResponse({'dates': date_list})

@csrf_exempt

# POST: ask question, save to GenAIChat; GET: get today's chat; GET with ?date=YYYY-MM-DD: get chat for date
@csrf_exempt
def genai_ask_view(request):
	user = get_jwt_user(request)
	if not user or user.role != 'Teacher' or not user.is_active or not user.is_approved:
		return JsonResponse({'error': 'Teacher access required'}, status=403)
	if request.method == 'POST':
		try:
			data = json.loads(request.body)
			prompt = data.get('prompt')
		except Exception:
			return JsonResponse({'error': 'Invalid JSON'}, status=400)
		if not prompt:
			return JsonResponse({'error': 'Prompt required'}, status=400)
		# Fetch attendance and trend data for teacher's class
		from .models import Attendance, User as UserModel
		students = UserModel.objects.filter(role='Student', class_assigned=user.class_assigned, is_approved=True)
		attendance_summary = []
		for s in students:
			records = Attendance.objects.filter(student=s).order_by('-date')[:30]  # last 30 records
			total = Attendance.objects.filter(student=s).count()
			present = Attendance.objects.filter(student=s, status='Present').count()
			percent = round((present/total)*100, 2) if total else 0
			attendance_summary.append({
				'name': s.username,
				'roll': s.roll_number,
				'present': present,
				'total': total,
				'percent': percent,
				'history': [ {'date': r.date.strftime('%Y-%m-%d'), 'status': r.status} for r in records ]
			})
		class_present = sum(s['present'] for s in attendance_summary)
		class_total = sum(s['total'] for s in attendance_summary)
		class_percent = round((class_present/class_total)*100, 2) if class_total else 0
		# Build context for Gemini
		import json as pyjson
		context = (
			f"You are a teacher dashboard assistant. You will be given attendance data in JSON format. "
			f"Respond accordingy if anything out of context from educational purposes is asked"
			f"Your job is to provide actionable insights, summaries, trends, and highlight students at risk (attendance < 75%). "
			f"If asked, provide suggestions for improvement.\n"
			f"Class: {user.class_assigned}\n"
			f"Class attendance: {class_present}/{class_total} ({class_percent}%)\n"
			f"Attendance data (JSON):\n{pyjson.dumps(attendance_summary, indent=2)}\n"
			f"Now answer the following teacher dashboard question based on the above data:\n{prompt}"
		)
		full_prompt = context
		try:
			api_key = os.getenv('GENAI_API_KEY')
			if not api_key:
				return JsonResponse({'error': 'GENAI_API_KEY not set'}, status=500)
			genai.configure(api_key=api_key)
			model = genai.GenerativeModel("gemini-1.5-flash")
			response = model.generate_content(full_prompt)
			text = getattr(response, 'text', str(response))
			# Save chat
			GenAIChat.objects.create(teacher=user, prompt=prompt, response=text)
			return JsonResponse({'response': text})
		except Exception as e:
			return JsonResponse({'error': str(e)}, status=500)
	elif request.method == 'GET':
		# Get chat history for today or for a given date
		from datetime import datetime
		date_str = request.GET.get('date')
		if date_str:
			try:
				date = datetime.strptime(date_str, '%Y-%m-%d').date()
			except Exception:
				return JsonResponse({'error': 'Invalid date format, use YYYY-MM-DD'}, status=400)
		else:
			date = timezone.now().date()
		chats = GenAIChat.objects.filter(teacher=user, date=date).order_by('timestamp')
		chat_list = [
			{'prompt': c.prompt, 'response': c.response, 'timestamp': c.timestamp.strftime('%H:%M:%S')}
			for c in chats
		]
		return JsonResponse({'date': str(date), 'history': chat_list})
	else:
		return JsonResponse({'error': 'Method not allowed'}, status=405)
# --- Teacher: List approved students in their class ---
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
def my_students_view(request):
	user = get_jwt_user(request)
	if not user or user.role != 'Teacher' or not user.is_active or not user.is_approved:
		return JsonResponse({'error': 'Teacher access required'}, status=403)
	students = User.objects.filter(role='Student', class_assigned=user.class_assigned, is_approved=True).order_by('roll_number')
	user_list = [
		{
			'id': u.id,
			'username': u.username,
			'role': u.role,
			'is_active': u.is_active,
			'is_approved': u.is_approved,
			'class_assigned': u.class_assigned,
			'roll_number': u.roll_number,
		}
		for u in students
	]
	return JsonResponse({'users': user_list})
# --- User info endpoint ---
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
def me_view(request):
	user = get_jwt_user(request)
	if not user or (user.role != 'Admin' and (not user.is_active or not user.is_approved)):
		return JsonResponse({'error': 'Authentication required'}, status=401)
	return JsonResponse({
		'id': user.id,
		'username': user.username,
		'role': user.role,
		'class_assigned': user.class_assigned,
		'roll_number': user.roll_number,
		'is_active': user.is_active,
		'is_approved': user.is_approved,
	})

# --- Profile update endpoint ---
@csrf_exempt
def profile_update_view(request):
	user = get_jwt_user(request)
	if not user or (user.role != 'Admin' and (not user.is_active or not user.is_approved)):
		return JsonResponse({'error': 'Authentication required'}, status=401)
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	try:
		data = json.loads(request.body)
		username = data.get('username')
		password = data.get('password')
		class_assigned = data.get('class_assigned')
	except Exception:
		return JsonResponse({'error': 'Invalid JSON'}, status=400)
	if username:
		user.username = username
	if password:
		user.set_password(password)
	if class_assigned and user.role in ['Teacher', 'Student']:
		user.class_assigned = class_assigned
	user.save()
	return JsonResponse({'message': 'Profile updated'})

# --- Teacher: Mark attendance for today ---
@csrf_exempt
def mark_attendance_view(request):
	user = get_jwt_user(request)
	if not user or user.role != 'Teacher' or not user.is_active or not user.is_approved:
		return JsonResponse({'error': 'Teacher access required'}, status=403)
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	try:
		data = json.loads(request.body)
		records = data.get('records', [])  # [{student_id, status}]
	except Exception:
		return JsonResponse({'error': 'Invalid JSON'}, status=400)
	from .models import Attendance
	today = timezone.now().date()
	results = []
	for rec in records:
		student_id = rec.get('student_id')
		status = rec.get('status')
		try:
			student = User.objects.get(id=student_id, role='Student', class_assigned=user.class_assigned)
			# Only one attendance per student per day
			att, created = Attendance.objects.get_or_create(student=student, date=today, defaults={'status': status})
			if not created:
				att.status = status
				att.save()
			results.append({'student_id': student_id, 'status': status, 'result': 'ok'})
		except User.DoesNotExist:
			results.append({'student_id': student_id, 'result': 'not found'})
	return JsonResponse({'results': results})

# --- Student: View personal attendance history ---
@csrf_exempt
def attendance_history_view(request):
	user = get_jwt_user(request)
	from .models import Attendance, User as UserModel
	# Student: can view own
	if user and user.role == 'Student' and user.is_active and user.is_approved:
		records = Attendance.objects.filter(student=user).order_by('-date')
		data = [
			{'date': str(r.date), 'status': r.status, 'timestamp': r.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
			for r in records
		]
		return JsonResponse({'attendance': data})
	# Admin: can view any student's attendance by ?student_id=ID
	if user and user.role == 'Admin':
		student_id = request.GET.get('student_id')
		if not student_id:
			return JsonResponse({'error': 'student_id required'}, status=400)
		try:
			student = UserModel.objects.get(id=student_id, role='Student')
		except UserModel.DoesNotExist:
			return JsonResponse({'error': 'Student not found'}, status=404)
		records = Attendance.objects.filter(student=student).order_by('-date')
		data = [
			{'date': str(r.date), 'status': r.status, 'timestamp': r.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
			for r in records
		]
		return JsonResponse({'attendance': data, 'student': student.username})
	# Teacher: can view attendance for students in their class
	if user and user.role == 'Teacher' and user.is_active and user.is_approved:
		student_id = request.GET.get('student_id')
		if not student_id:
			return JsonResponse({'error': 'student_id required'}, status=400)
		try:
			student = UserModel.objects.get(id=student_id, role='Student', class_assigned=user.class_assigned)
		except UserModel.DoesNotExist:
			return JsonResponse({'error': 'Student not found or not in your class'}, status=404)
		records = Attendance.objects.filter(student=student).order_by('-date')
		data = [
			{'date': str(r.date), 'status': r.status, 'timestamp': r.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
			for r in records
		]
		return JsonResponse({'attendance': data, 'student': student.username})
	return JsonResponse({'error': 'Access denied'}, status=403)
# --- Class attendance trends (for teacher/admin) ---
@csrf_exempt
def class_attendance_trends_view(request):
	user = get_jwt_user(request)
	from .models import Attendance, User as UserModel
	if not user or (user.role != 'Admin' and (not user.is_active or not user.is_approved)):
		return JsonResponse({'error': 'Authentication required'}, status=401)
	if user.role == 'Teacher':
		class_id = user.class_assigned
	elif user.role == 'Admin':
		class_id = request.GET.get('class_id')
		if not class_id:
			return JsonResponse({'error': 'class_id required'}, status=400)
	else:
		return JsonResponse({'error': 'Access denied'}, status=403)
	# Get all students in class
	students = UserModel.objects.filter(role='Student', class_assigned=class_id, is_approved=True)
	# Get attendance records for class
	records = Attendance.objects.filter(student__in=students)
	# Aggregate by date
	from collections import defaultdict
	date_stats = defaultdict(lambda: {'present': 0, 'absent': 0, 'total': 0})
	for r in records:
		date_stats[r.date]['total'] += 1
		if r.status == 'Present':
			date_stats[r.date]['present'] += 1
		else:
			date_stats[r.date]['absent'] += 1
	# Format for chart
	chart = [
		{'date': str(date), 'present': v['present'], 'absent': v['absent'], 'total': v['total']}
		for date, v in sorted(date_stats.items())
	]
	return JsonResponse({'trends': chart})


import json
import jwt
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User
from django.db import IntegrityError

JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 60 * 60 * 24  # 1 day

def generate_jwt(user):
	payload = {
		'user_id': user.id,
		'username': user.username,
		'role': user.role,
		'exp': int((timezone.now() + timezone.timedelta(seconds=JWT_EXP_DELTA_SECONDS)).timestamp()),
	}
	return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token):
	try:
		return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
	except jwt.ExpiredSignatureError:
		return None
	except jwt.InvalidTokenError:
		return None

@csrf_exempt
def login_view(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	try:
		data = json.loads(request.body)
		username = data.get('username')
		password = data.get('password')
	except Exception:
		return JsonResponse({'error': 'Invalid JSON'}, status=400)
	try:
		user = User.objects.get(username=username)
		if not user.check_password(password):
			return JsonResponse({'error': 'Invalid credentials'}, status=401)
		# Only enforce is_active/is_approved for non-admins
		if user.role != 'Admin' and (not user.is_active or not user.is_approved):
			return JsonResponse({'error': 'Account not active or not approved'}, status=403)
		token = generate_jwt(user)
		response = JsonResponse({'message': 'Login successful', 'role': user.role, 'username': user.username})
		response.set_cookie('jwt', token, httponly=True, samesite='Lax')
		return response
	except User.DoesNotExist:
		return JsonResponse({'error': 'Invalid credentials'}, status=401)

@csrf_exempt
def logout_view(request):
	response = JsonResponse({'message': 'Logged out'})
	response.delete_cookie('jwt')
	return response

@csrf_exempt
def register_view(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	try:
		data = json.loads(request.body)
		username = data.get('username')
		password = data.get('password')
		role = data.get('role')
		class_assigned = data.get('class_assigned')
		roll_number = data.get('roll_number')
	except Exception:
		return JsonResponse({'error': 'Invalid JSON'}, status=400)
	if role not in ['Teacher', 'Student']:
		return JsonResponse({'error': 'Role must be Teacher or Student'}, status=400)
	if not username or not password:
		return JsonResponse({'error': 'Username and password required'}, status=400)
	if not class_assigned or not (1 <= int(class_assigned) <= 12):
		return JsonResponse({'error': 'Class must be 1-12'}, status=400)
	if role == 'Student' and not roll_number:
		return JsonResponse({'error': 'Roll number required for students'}, status=400)
	try:
		if role == 'Student':
			# Enforce unique roll_number per class
			if User.objects.filter(role='Student', class_assigned=class_assigned, roll_number=roll_number).exists():
				return JsonResponse({'error': 'Roll number already exists in this class'}, status=409)
		if role == 'Teacher':
			# Only one teacher per class
			if User.objects.filter(role='Teacher', class_assigned=class_assigned, is_approved=True).exists():
				return JsonResponse({'error': 'A teacher is already assigned to this class'}, status=409)
		user = User.objects.create_user(
			username=username,
			password=password,
			role=role,
			class_assigned=class_assigned,
			roll_number=roll_number if role == 'Student' else None,
			is_active=False,
			is_approved=False,
		)
		return JsonResponse({'message': 'Registration successful, pending admin approval'})
	except IntegrityError:
		return JsonResponse({'error': 'Username already exists'}, status=409)


# --- Helper for JWT authentication and admin check ---
from functools import wraps

def get_jwt_user(request):
	token = request.COOKIES.get('jwt')
	if not token:
		return None
	payload = decode_jwt(token)
	if not payload:
		return None
	try:
		return User.objects.get(id=payload['user_id'])
	except User.DoesNotExist:
		return None

def admin_required(view_func):
	@wraps(view_func)
	def _wrapped(request, *args, **kwargs):
		user = get_jwt_user(request)
		if not user or user.role != 'Admin':
			return JsonResponse({'error': 'Admin access required'}, status=403)
		request.user = user
		return view_func(request, *args, **kwargs)
	return _wrapped

# --- Admin: Approve user ---
@csrf_exempt
@admin_required
def approve_user_view(request):
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	try:
		data = json.loads(request.body)
		user_id = data.get('user_id')
		approve = data.get('approve', True)
	except Exception:
		return JsonResponse({'error': 'Invalid JSON'}, status=400)
	try:
		user = User.objects.get(id=user_id)
		if user.role == 'Teacher':
			# Only one teacher per class
			if approve and User.objects.filter(role='Teacher', class_assigned=user.class_assigned, is_approved=True, is_active=True).exclude(id=user.id).exists():
				return JsonResponse({'error': 'Class already has a teacher'}, status=409)
		if approve:
			user.is_active = True
			user.is_approved = True
		else:
			user.is_active = False
			user.is_approved = False
		user.save()
		return JsonResponse({'message': f"User {'approved' if approve else 'disapproved'}"})
	except User.DoesNotExist:
		return JsonResponse({'error': 'User not found'}, status=404)

# --- Admin: List users (with filters) ---
@csrf_exempt
@admin_required
def users_view(request):
	role = request.GET.get('role')
	class_assigned = request.GET.get('class_assigned')
	users = User.objects.all()
	if role:
		users = users.filter(role=role)
	if class_assigned:
		users = users.filter(class_assigned=class_assigned)
	users = users.order_by('role', 'class_assigned', 'roll_number', 'username')
	user_list = [
		{
			'id': u.id,
			'username': u.username,
			'role': u.role,
			'is_active': u.is_active,
			'is_approved': u.is_approved,
			'class_assigned': u.class_assigned,
			'roll_number': u.roll_number,
		}
		for u in users
	]
	return JsonResponse({'users': user_list})
