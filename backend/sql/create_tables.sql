-- Facets Jewellery CRM schema (SQL Server). Mirrors SQLAlchemy models.
IF OBJECT_ID('users','U') IS NULL
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(120) NOT NULL,
    email NVARCHAR(160) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'Sales',
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('leads','U') IS NULL
CREATE TABLE leads (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(160) NOT NULL,
    phone NVARCHAR(32) NULL,
    email NVARCHAR(160) NULL,
    company NVARCHAR(160) NULL,
    city NVARCHAR(80) NULL,
    source NVARCHAR(40) NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'New',
    budget FLOAT NOT NULL DEFAULT 0,
    customer_type NVARCHAR(40) NULL,
    notes NVARCHAR(MAX) NULL,
    assigned_to INT NULL FOREIGN KEY REFERENCES users(id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('activities','U') IS NULL
CREATE TABLE activities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lead_id INT NOT NULL FOREIGN KEY REFERENCES leads(id),
    activity_type NVARCHAR(40) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    created_by INT NULL FOREIGN KEY REFERENCES users(id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('calls','U') IS NULL
CREATE TABLE calls (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lead_id INT NOT NULL FOREIGN KEY REFERENCES leads(id),
    call_duration INT NOT NULL DEFAULT 0,
    call_status NVARCHAR(40) NOT NULL DEFAULT 'Completed',
    call_summary NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('tasks','U') IS NULL
CREATE TABLE tasks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lead_id INT NULL FOREIGN KEY REFERENCES leads(id),
    assigned_to INT NULL FOREIGN KEY REFERENCES users(id),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    priority NVARCHAR(20) NOT NULL DEFAULT 'Medium',
    status NVARCHAR(20) NOT NULL DEFAULT 'Open',
    due_date DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('whatsapp_messages','U') IS NULL
CREATE TABLE whatsapp_messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lead_id INT NOT NULL FOREIGN KEY REFERENCES leads(id),
    direction NVARCHAR(10) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('notifications','U') IS NULL
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('products','U') IS NULL
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_name NVARCHAR(200) NOT NULL,
    category NVARCHAR(80) NULL,
    metal_type NVARCHAR(40) NULL,
    purity NVARCHAR(20) NULL,
    weight FLOAT NOT NULL DEFAULT 0,
    making_charges FLOAT NOT NULL DEFAULT 0,
    price FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('appointments','U') IS NULL
CREATE TABLE appointments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_name NVARCHAR(160) NOT NULL,
    lead_id INT NULL FOREIGN KEY REFERENCES leads(id),
    appointment_date DATETIME2 NOT NULL,
    showroom_visit BIT NOT NULL DEFAULT 1,
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('quotations','U') IS NULL
CREATE TABLE quotations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lead_id INT NOT NULL FOREIGN KEY REFERENCES leads(id),
    quotation_number NVARCHAR(40) NOT NULL UNIQUE,
    amount FLOAT NOT NULL DEFAULT 0,
    status NVARCHAR(30) NOT NULL DEFAULT 'Draft',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('ai_agent_logs','U') IS NULL
CREATE TABLE ai_agent_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lead_id INT NOT NULL FOREIGN KEY REFERENCES leads(id),
    conversation_summary NVARCHAR(MAX) NULL,
    sentiment NVARCHAR(20) NULL,
    next_action NVARCHAR(200) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
