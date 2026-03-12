#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE "scout-development"'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'scout-development')\gexec

  SELECT 'CREATE DATABASE "scout-test"'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'scout-test')\gexec
EOSQL
