

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone

class UserManager(BaseUserManager):
	def create_user(self, username, password=None, role=None, **extra_fields):
		if not username:
			raise ValueError('Users must have a username')
		user = self.model(username=username, role=role, **extra_fields)
		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_superuser(self, username, password=None, **extra_fields):
		extra_fields.setdefault('role', 'Admin')
		extra_fields.setdefault('is_superuser', True)
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_active', True)
		return self.create_user(username, password, **extra_fields)



class User(AbstractBaseUser):
	ROLE_CHOICES = [
		('Admin', 'Admin'),
		('Teacher', 'Teacher'),
		('Student', 'Student'),
	]
	username = models.CharField(max_length=150, unique=True)
	role = models.CharField(max_length=10, choices=ROLE_CHOICES)
	is_active = models.BooleanField(default=False)
	is_approved = models.BooleanField(default=False)
	class_assigned = models.PositiveSmallIntegerField(null=True, blank=True)
	roll_number = models.PositiveIntegerField(null=True, blank=True)
	is_staff = models.BooleanField(default=False)
	is_superuser = models.BooleanField(default=False)

	USERNAME_FIELD = 'username'
	REQUIRED_FIELDS = ['role']

	objects = UserManager()

	def __str__(self):
		return f"{self.username} ({self.role})"
		
	def has_perm(self, perm, obj=None):
		return self.is_superuser

	def has_module_perms(self, app_label):
		return self.is_superuser

class Attendance(models.Model):
	STATUS_CHOICES = [
		('Present', 'Present'),
		('Absent', 'Absent'),
	]
	student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'Student'})
	date = models.DateField(default=timezone.now)
	status = models.CharField(max_length=7, choices=STATUS_CHOICES)
	timestamp = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"{self.student.username} - {self.date} - {self.status}"

# GenAIChat model for persistent teacher chat history
class GenAIChat(models.Model):
	teacher = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'Teacher'})
	prompt = models.TextField()
	response = models.TextField()
	date = models.DateField(default=timezone.now)
	timestamp = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"{self.teacher.username} - {self.date} - {self.prompt[:20]}..."
