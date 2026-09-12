"""Add new columns to app_snapshots table"""
import sys
sys.path.insert(0, '/home/safyeldin/.opencode/media-pulse/backend')

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'app_snapshots' 
            AND column_name IN ('installs_exact', 'installs_display', 'installs_bucket_min', 
                               'star_distribution', 'daily_downloads', 'daily_growth_pct',
                               'version', 'last_updated', 'developer', 'category',
                               'is_free', 'offers_iap', 'ad_supported')
        """))
        existing = {row[0] for row in result}
        
        columns_to_add = [
            ('installs_exact', 'INTEGER'),
            ('installs_display', 'VARCHAR(50)'),
            ('installs_bucket_min', 'INTEGER'),
            ('star_distribution', 'JSON'),
            ('daily_downloads', 'INTEGER'),
            ('daily_growth_pct', 'FLOAT'),
            ('version', 'VARCHAR(50)'),
            ('last_updated', 'VARCHAR(100)'),
            ('developer', 'VARCHAR(255)'),
            ('category', 'VARCHAR(100)'),
            ('is_free', 'BOOLEAN'),
            ('offers_iap', 'BOOLEAN'),
            ('ad_supported', 'BOOLEAN'),
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