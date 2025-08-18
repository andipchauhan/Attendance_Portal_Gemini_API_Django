### NOTE:  If you want a fresh start without existing admin and DB entries, delete existing dbsqlite3 file in backend first



# FOR RUNNING WEBAPP FOLLOW THE COMMANDS AS GIVEN BELOW
1. first create a venv with the required dependencies of python or install them globally(not recommended)
2. venv is at same folder level as frontend and backend
3. create a ".env" file in backend and enter your gemini api key as **GENAI_API_KEY=Your-Api-Key**

## At parent folder
```
python -m venv venv
venv/scripts/activate
pip install -r requirements.txt

```

### Terminal 1
```
cd frontend 
npm i
npm start
```

### Terminal 2 (IF YOU WANT A CLEAN START WITHOUT EXISTING ADMIN OTHERWISE SKIP TO OTHER STEP)  
### Enter creds for admin when prompted after 'createsuperuser' command - Role: Admin
```
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Terminal 2 (WITH EXISTING ENTRIES)
```
cd backend
python manage.py runserver
```

### EXISTING CREDENTIALS
- username: admin , password: admin
- username: teacher10, password: teacher10
- and so on for respective class teachers and students 




### To create a requirements.txt
```
pip freeze > requirements.txt
```