-- Microsoft SQL Server: create database script (provided for portability;
-- the running demo uses SQLite via SQLAlchemy. Run on Windows SQL Server).
IF DB_ID('FacetsCRM') IS NULL
BEGIN
    CREATE DATABASE FacetsCRM;
END
GO
USE FacetsCRM;
GO
