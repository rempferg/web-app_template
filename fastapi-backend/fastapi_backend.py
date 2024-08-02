from fastapi import FastAPI
import psycopg2

conn = psycopg2.connect(database="mydatabase",
                        host="localhost",
                        user="fastapitest",
                        password="Fc5h4L",
                        port="5432")

app = FastAPI()

subapi = FastAPI()
app.mount("/api", subapi)

@subapi.get("/")
async def root():
    cursor = conn.cursor()
    cursor.execute("SELECT COALESCE(JSON_AGG(r), '[]'::json) FROM (SELECT * FROM messages) r")
    result = cursor.fetchone()[0]
    print(result)
    return result


# this allows requests towards your API from frontend websites not served from the same host as this backend.
# access from non-browser clients is always possible.
# you want this when you run the front- and backend in separate webservers using different ports of your developer machine.
# if you want to turn this on in production, read up on CORS and the Cross-Site Request Forgery attacks it's meant to prevent.

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)