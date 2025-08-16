from django.urls import path
from . import views

from .views_extra import delete_user_view

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('approve_user/', views.approve_user_view, name='approve_user'),
    path('users/', views.users_view, name='users'),
    path('my_students/', views.my_students_view, name='my_students'),
    path('attendance/mark/', views.mark_attendance_view, name='mark_attendance'),
    path('attendance/history/', views.attendance_history_view, name='attendance_history'),
    path('profile/update/', views.profile_update_view, name='profile_update'),
    path('me/', views.me_view, name='me'),
    path('delete_user/', delete_user_view, name='delete_user'),
    path('attendance/trends/', views.class_attendance_trends_view, name='class_attendance_trends'),
    path('attendance/marked_today/', views.attendance_marked_today_view, name='attendance_marked_today'),
    path('genai/ask/', views.genai_ask_view, name='genai_ask'),
    path('genai/chat_dates/', views.genai_chat_dates_view, name='genai_chat_dates'),
]
