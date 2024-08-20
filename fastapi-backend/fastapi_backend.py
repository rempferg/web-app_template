from fastapi import FastAPI
from typing import Union
from pydantic import BaseModel
import psycopg2


conn = psycopg2.connect(database="fastapitest",
                        host="localhost",
                        user="fastapitest",
                        password="myPassword",
                        port="5432")

app = FastAPI()

subapi = FastAPI()
app.mount("/api", subapi)


@subapi.get("/")
async def root():
    cursor = conn.cursor()
    cursor.execute('''SELECT COALESCE(JSON_AGG(r), '[]'::json) FROM (SELECT id as "ID", message as "Message", CONCAT(firstname, ' ', lastname) as "Name" FROM messages) r''')
    result = cursor.fetchone()[0]
    cursor.close()
    print(result)
    return result


class Item(BaseModel):
    firstname: str
    lastname: str
    message: str

@subapi.post("/")
async def add(item: Item):
    item_dict = item.dict()
    print(item_dict)
    cursor = conn.cursor()
    cursor.execute('''INSERT INTO messages(firstname, lastname, message) VALUES(%(firstname)s, %(lastname)s, %(message)s)''', item_dict)
    conn.commit()
    cursor.close()
    return 


@subapi.delete("/{id}")
async def delete(id: int):
    cursor = conn.cursor()
    cursor.execute('''DELETE FROM messages WHERE id = %s''', (id, ))
    conn.commit()
    cursor.close()
    return

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