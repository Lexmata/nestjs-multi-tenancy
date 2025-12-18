-- Database initialization script for multi-tenant development
-- This script runs automatically when containers are first created

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (tenant-aware)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Create projects table (tenant-aware)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tenant filtering
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

-- Insert sample tenants
INSERT INTO tenants (id, name, slug, settings) VALUES
    ('tenant-1', 'Acme Corporation', 'acme', '{"plan": "enterprise", "features": ["advanced"]}'),
    ('tenant-2', 'Globex Inc', 'globex', '{"plan": "pro", "features": ["basic"]}'),
    ('tenant-3', 'Initech', 'initech', '{"plan": "starter", "features": []}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample users
INSERT INTO users (id, tenant_id, email, name, role) VALUES
    ('user-1', 'tenant-1', 'admin@acme.com', 'Acme Admin', 'admin'),
    ('user-2', 'tenant-1', 'user@acme.com', 'Acme User', 'user'),
    ('user-3', 'tenant-2', 'admin@globex.com', 'Globex Admin', 'admin'),
    ('user-4', 'tenant-2', 'user@globex.com', 'Globex User', 'user'),
    ('user-5', 'tenant-3', 'admin@initech.com', 'Initech Admin', 'admin')
ON CONFLICT DO NOTHING;

-- Insert sample projects
INSERT INTO projects (id, tenant_id, name, description, status) VALUES
    ('project-1', 'tenant-1', 'Acme Website', 'Corporate website redesign', 'active'),
    ('project-2', 'tenant-1', 'Acme Mobile App', 'iOS and Android app', 'planning'),
    ('project-3', 'tenant-2', 'Globex Platform', 'Main SaaS platform', 'active'),
    ('project-4', 'tenant-3', 'TPS Reports', 'TPS report automation', 'completed')
ON CONFLICT DO NOTHING;

-- Grant permissions (for PostgreSQL)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

