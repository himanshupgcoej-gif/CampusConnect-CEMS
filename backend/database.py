
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Connect to the CEMS Supabase PostgreSQL database."""

    try:
        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            raise ValueError("DATABASE_URL is missing from .env file")

        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )

        return conn

    except Exception as e:
        print("Supabase Database Connection Failed!")
        print("Error:", e)
        return None


if __name__ == "__main__":

    conn = get_connection()

    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT current_database()")

            print("Supabase Connected Successfully!")
            print("Connected Database:", cursor.fetchone()[0])

        finally:
            conn.close()
