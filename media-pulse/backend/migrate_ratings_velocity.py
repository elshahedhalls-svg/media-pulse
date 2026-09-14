"""Add ratings-velocity columns to app_snapshots table"""
import sys
sys.path.insert(0, '/home/safyeldin/.opencode/media-pulse/backend')

from database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'app_snapshots'
            AND column_name IN ('new_ratings', 'downloads_est_low', 'downloads_est_high')
        """))
        existing = {row[0] for row in result}

        columns_to_add = [
            ('new_ratings', 'INTEGER'),
            ('downloads_est_low', 'INTEGER'),
            ('downloads_est_high', 'INTEGER'),
        ]

        for col_name, col_type in columns_to_add:
            if col_name not in existing:
                try:
                    conn.execute(text(f"ALTER TABLE app_snapshots ADD COLUMN {col_name} {col_type}"))
                    print(f"✓ Added column: {col_name} ({col_type})")
                except Exception as e:
                    print(f"✗ Error adding {col_name}: {e}")
            else:
                print(f"- Column {col_name} already exists")

        conn.commit()
        print("\nMigration complete!")


if __name__ == "__main__":
    migrate()
