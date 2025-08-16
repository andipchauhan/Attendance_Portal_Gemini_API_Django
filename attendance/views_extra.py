from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import User

@csrf_exempt
def delete_user_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        import json
        data = json.loads(request.body)
        user_id = data.get('user_id')
        user = User.objects.get(id=user_id)
        if user.role == 'Admin':
            return JsonResponse({'error': 'Cannot delete admin'}, status=403)
        user.delete()
        return JsonResponse({'message': 'User deleted'})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception:
        return JsonResponse({'error': 'Invalid request'}, status=400)
