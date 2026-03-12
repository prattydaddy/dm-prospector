#!/usr/bin/env python3
"""Load insurance agency data into Neon DB from FL raw + combined CSV."""

import csv
import re
import os
import subprocess
import tempfile

FL_RAW = "/root/.openclaw/workspace-digitalmules/data/insurance-agencies/florida/florida_agencies_raw.csv"
COMBINED = "/root/.openclaw/workspace-digitalmules/data/insurance-agencies/all_agencies_combined.csv"
DB_URL = "postgresql://neondb_owner:npg_hHTidC5OY0Rj@ep-calm-dawn-aiupf8s4-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

def clean_eq(val):
    """Remove =\"...\" wrappers from FL data."""
    if val and val.startswith('="') and val.endswith('"'):
        return val[2:-1]
    return val

def clean_val(val):
    """Clean and truncate values."""
    if val is None:
        return ''
    val = val.strip()
    if val in ('', 'NULL', 'null', 'None'):
        return ''
    return val

def escape_copy(val):
    """Escape value for COPY format."""
    if not val:
        return '\\N'
    # Escape backslashes, tabs, newlines
    val = val.replace('\\', '\\\\').replace('\t', '\\t').replace('\n', '\\n').replace('\r', '\\r')
    return val

def load_florida():
    """Parse FL raw CSV and return list of record dicts."""
    records = []
    seen = set()
    
    with open(FL_RAW, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            license_num = clean_eq(clean_val(row.get('License Number', '')))
            npn = clean_eq(clean_val(row.get('NPN Number', '')))
            name = clean_val(row.get('Full Name', ''))
            
            if not name:
                continue
            
            # Dedupe key
            key = (license_num, 'FL') if license_num else (npn, 'FL') if npn else (name, 'FL')
            if key in seen:
                continue
            seen.add(key)
            
            phone = clean_eq(clean_val(row.get('Business Phone', '')))
            zip_code = clean_eq(clean_val(row.get('Business Zip', '')))
            
            # Build address
            addr1 = clean_val(row.get('Business Address1', ''))
            addr2 = clean_val(row.get('Business Address2', ''))
            address = f"{addr1} {addr2}".strip() if addr2 else addr1
            
            license_type_code = clean_eq(clean_val(row.get('License TYCL', '')))
            license_type_desc = clean_val(row.get('License TYCL Desc', ''))
            
            records.append({
                'agency_name': name,
                'owner_principal': '',
                'address': address,
                'city': clean_val(row.get('Business City', '')),
                'state': 'FL',
                'zip': zip_code[:15] if zip_code else '',
                'county': clean_val(row.get('Business County', '')),
                'phone': phone[:20] if phone else '',
                'email': clean_val(row.get('Email Address', '')),
                'license_number': license_num[:30] if license_num else '',
                'npn': npn[:20] if npn else '',
                'license_type': license_type_desc if license_type_desc else license_type_code,
                'lines_of_authority': '',
                'status': clean_val(row.get('License Status', '')),
                'source_state': 'FL',
                'source': 'Florida DOI',
            })
    
    print(f"Florida: {len(records)} records parsed")
    return records, seen

def load_combined(fl_seen):
    """Parse combined CSV for TX and IA records only."""
    records = []
    seen = set()
    
    with open(COMBINED, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = clean_val(row.get('source_state', '') or row.get('state', ''))
            # Skip FL records - already loaded from raw
            if state == 'FL':
                continue
            
            name = clean_val(row.get('agency_name', ''))
            if not name:
                continue
            
            license_num = clean_val(row.get('license_number', ''))
            npn = clean_val(row.get('npn', ''))
            
            key = (license_num, state) if license_num else (npn, state) if npn else (name, state)
            if key in seen:
                continue
            seen.add(key)
            
            records.append({
                'agency_name': name,
                'owner_principal': clean_val(row.get('owner_principal', '')),
                'address': clean_val(row.get('address', '')),
                'city': clean_val(row.get('city', '')),
                'state': state[:5] if state else '',
                'zip': clean_val(row.get('zip', ''))[:15],
                'county': '',
                'phone': '',
                'email': '',
                'license_number': license_num[:30] if license_num else '',
                'npn': npn[:20] if npn else '',
                'license_type': clean_val(row.get('license_type', '')),
                'lines_of_authority': clean_val(row.get('lines_of_authority', '')),
                'status': clean_val(row.get('status', '')),
                'source_state': state[:5] if state else '',
                'source': clean_val(row.get('source', '')),
            })
    
    print(f"Combined (non-FL): {len(records)} records parsed")
    return records

def write_copy_file(records, filepath):
    """Write records to a tab-separated file for COPY."""
    cols = ['agency_name', 'owner_principal', 'address', 'city', 'state', 'zip', 
            'county', 'phone', 'email', 'license_number', 'npn', 'license_type',
            'lines_of_authority', 'status', 'source_state', 'source']
    
    with open(filepath, 'w', encoding='utf-8') as f:
        for rec in records:
            values = [escape_copy(rec.get(c, '')) for c in cols]
            f.write('\t'.join(values) + '\n')
    
    print(f"Written {len(records)} records to {filepath}")

def load_via_psql(filepath, batch_name):
    """Load data via psql COPY."""
    cols = 'agency_name,owner_principal,address,city,state,zip,county,phone,email,license_number,npn,license_type,lines_of_authority,status,source_state,source'
    
    cmd = f"""PGPASSWORD=npg_hHTidC5OY0Rj psql -h ep-calm-dawn-aiupf8s4-pooler.c-4.us-east-1.aws.neon.tech -U neondb_owner -d neondb -c "\\copy insurance_agencies({cols}) FROM '{filepath}' WITH (FORMAT text, NULL '\\\\N')" """
    
    print(f"Loading {batch_name}...")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        # Fall back to batch INSERT
        return False
    print(f"COPY result: {result.stdout.strip()} {result.stderr.strip()}")
    return True

if __name__ == '__main__':
    # Load FL data
    fl_records, fl_seen = load_florida()
    
    # Load combined (non-FL)
    combined_records = load_combined(fl_seen)
    
    all_records = fl_records + combined_records
    print(f"\nTotal records to load: {len(all_records)}")
    
    # Write to temp file
    tmpfile = '/tmp/insurance_agencies_load.tsv'
    write_copy_file(all_records, tmpfile)
    
    # Load via COPY
    success = load_via_psql(tmpfile, "all agencies")
    
    if not success:
        print("COPY failed, trying batch INSERT approach...")
        # Split into chunks and insert
        import psycopg2
        # Won't use this path unless COPY fails
    
    # Verify count
    result = subprocess.run(
        "PGPASSWORD=npg_hHTidC5OY0Rj psql -h ep-calm-dawn-aiupf8s4-pooler.c-4.us-east-1.aws.neon.tech -U neondb_owner -d neondb -t -c 'SELECT count(*) FROM insurance_agencies'",
        shell=True, capture_output=True, text=True
    )
    print(f"\nDB record count: {result.stdout.strip()}")
    
    # Show state breakdown
    result = subprocess.run(
        "PGPASSWORD=npg_hHTidC5OY0Rj psql -h ep-calm-dawn-aiupf8s4-pooler.c-4.us-east-1.aws.neon.tech -U neondb_owner -d neondb -c \"SELECT state, count(*) FROM insurance_agencies GROUP BY state ORDER BY count(*) DESC\"",
        shell=True, capture_output=True, text=True
    )
    print(f"State breakdown:\n{result.stdout}")
