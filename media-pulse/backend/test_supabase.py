"""Test Supabase Postgres connection"""
import os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("DATABASE_URL")
print(f"Testing URL: {url[:60]}...")

try:
    from sqlalchemy import create_engine, text
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1 as test"))
        print("✅ Supabase Postgres connected! SELECT 1 =", list(result)[0][0])
        # Try to create tables
        from database import Base
        import models  # noqa
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created / verified")
        # Check if crud init works
        from sqlalchemy.orm import Session
        session = Session(bind=engine)
        from crud import init_db
        init_db(session)
        print("✅ init_db done (regions + users)")
        # Count
        from models import Country, User
        print(f"Countries: {session.query(Country).count()}, Users: {session.query(User).count()}")
        session.close()
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    print("\nTrying direct fallback...")
    import urllib.parse
    direct = f"postgresql://postgres:{urllib.parse.quote_plus('Shahed@2024')}@db.rpbybnbrcyfrqjgqpkxi.supabase.co:5432/postgres"
    try:
        engine2 = create_engine(direct, pool_pre_ping=True, connect_args={"connect_timeout": 5})
        with engine2.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Direct connected!", list(result)[0][0])
    except Exception as e2:
        print(f"❌ Direct also failed: {e2}")
