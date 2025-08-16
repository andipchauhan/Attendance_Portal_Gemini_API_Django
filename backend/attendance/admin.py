from django.contrib import admin
from .models import User, Attendance

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
	list_display = ('username', 'role', 'is_active', 'is_approved', 'class_assigned', 'roll_number')
	list_filter = ('role', 'is_active', 'is_approved', 'class_assigned')
	search_fields = ('username',)

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
	list_display = ('student', 'date', 'status', 'timestamp')
	list_filter = ('date', 'status')
	search_fields = ('student__username',)
