# Commercial Proposal
## Transport Management System (TMS)

---

## Executive Summary

This proposal outlines a comprehensive **Transport Management System** designed for logistics and transportation companies. The system provides end-to-end management of orders, bookings, billing, and customer relationships with built-in compliance for GST regulations.

---

## Technical Specifications

### 1. Frontend Architecture

**Technology Stack:**
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 5.4.2 (Fast build times, optimized production bundles)
- **UI Framework:** Tailwind CSS 3.4.1 (Modern, responsive design)
- **Icons Library:** Lucide React (Lightweight, customizable icons)
- **Routing:** React Router (Single Page Application architecture)

**Key Features:**
- Fully responsive design (Mobile, Tablet, Desktop)
- Real-time form validation
- Dynamic search and filtering
- Auto-complete dropdowns with search functionality
- Print-ready invoice and LR templates
- Role-based UI rendering
- Session management and protected routes

### 2. Backend & Database

**Platform:** Supabase (Enterprise-grade Backend as a Service)

**Database:**
- **Type:** PostgreSQL 15+ (Industry standard, ACID compliant)
- **Features:**
  - Row Level Security (RLS) policies on all tables
  - Foreign key constraints for data integrity
  - Indexed columns for optimal query performance
  - Automatic timestamp tracking (created_at, updated_at)
  - UUID primary keys for security

**Authentication:**
- Email/Password authentication
- JWT-based session management
- Role-based access control (Admin, User roles)
- Secure password hashing (bcrypt)
- Session timeout handling

**Storage:**
- Secure file storage for vendor documents
- Company logo storage
- Access control with RLS policies
- Support for multiple file formats

**API Layer:**
- RESTful API via Supabase client
- Real-time subscriptions capability
- Automatic API documentation
- CORS-enabled endpoints

### 3. Database Schema

**Master Tables:**
1. **profiles** - User profiles with role management
2. **state_master** - Indian states with GST codes
3. **city_master** - Cities mapped to states
4. **branch_master** - Company branch locations
5. **customer_master** - Customer database (5000+ records)
6. **customer_gst_master** - Customer GST registration details
7. **vehicle_master** - Vehicle types and specifications
8. **vendor_master** - Vendor/transporter database
9. **company_master** - Company registration details

**Transactional Tables:**
1. **order_enquiry** - Customer order requests and quotes
2. **booking_lr** - Lorry Receipt bookings with financial details
3. **lr_bill** - Bill generation and tracking
4. **thc_details** - Terminal Handling Charges

**Supporting Tables:**
- **vendor_documents** (Storage) - Vendor document management
- **company_logos** (Storage) - Company branding assets

---

## Functional Modules

### 1. User Management
- User registration and authentication
- Role-based access control (Admin/User)
- Profile management with photo upload
- Password change functionality
- Branch-based user assignment

### 2. Master Data Management

**Branch Master:**
- Multi-branch support
- Branch code generation
- Contact details management
- Active/Inactive status

**City & State Master:**
- Comprehensive Indian city database
- State mapping with GST codes
- Alphabetical state codes for compliance

**Customer Master:**
- 5000+ customer records
- Customer ID auto-generation
- Active/Inactive status tracking
- Contact information management

**Customer GST Master:**
- Multiple GST registrations per customer
- GSTIN validation format
- Billing address management
- State-wise GST tracking

**Vehicle Type Master:**
- Vehicle categories
- Capacity specifications
- Active/Inactive management

**Vendor Master:**
- Transporter/vendor database
- Document upload and management
- Contact details
- Payment terms

**Company Master:**
- Company registration details
- GST and PAN information
- Logo upload
- Multi-location support
- Bank account details

### 3. Operations Management

**Order/Enquiry Management:**
- New enquiry creation
- Real-time status tracking (Open/Confirmed/Cancelled)
- Customer and route selection
- Weight and rate calculation
- Vehicle type assignment
- Loading date scheduling

**LR (Lorry Receipt) Entry:**
- Automatic LR number generation (LR3000001 format)
- Origin and destination tracking
- Billing party selection
- Vehicle and driver assignment
- Freight calculation
- GST computation (CGST/SGST/IGST)
- Consignor/Consignee details
- Material description

**Financial Management:**
- Freight amount calculation
- Loading/Unloading charges
- Statistical charges
- Hamali charges
- Other additional charges
- GST calculation and breakdown
- Bill due date tracking
- Payment status monitoring

### 4. Billing & Documentation

**Bill Generation:**
- Automatic bill number generation
- Customer-wise bill consolidation
- GST-compliant invoice format
- Company logo integration
- Detailed charge breakdown
- Print-ready format

**LR Printing:**
- Professional LR format
- Company branding
- Consignment details
- Terms and conditions
- Print optimization

**Bill Printing:**
- GST-compliant invoice
- CGST/SGST/IGST breakdown
- HSN/SAC codes
- Company and customer details
- Bank account information
- Professional layout

### 5. Reports & Analytics

- Order enquiry tracking
- LR status reports
- Financial reconciliation
- Customer-wise analysis
- Date range filtering
- Export capabilities

---

## Security Features

1. **Authentication & Authorization:**
   - Secure JWT-based authentication
   - Role-based access control
   - Session management
   - Password encryption

2. **Database Security:**
   - Row Level Security (RLS) on all tables
   - User can only access permitted data
   - Admin-only operations protection
   - SQL injection prevention

3. **Data Protection:**
   - Input validation and sanitization
   - XSS protection
   - CSRF protection
   - Secure file upload validation

4. **Compliance:**
   - GST regulation compliance
   - Data privacy standards
   - Audit trail capability

---

## Development Effort Breakdown

### Phase 1: Foundation & Architecture (120 hours)
- Project setup and configuration: 16 hours
- Database schema design: 24 hours
- Authentication system: 20 hours
- Role-based access control: 16 hours
- UI/UX framework setup: 20 hours
- Master data migrations: 24 hours

### Phase 2: Master Data Modules (140 hours)
- User Master: 16 hours
- Branch Master: 16 hours
- State & City Master: 20 hours
- Customer Master (5000+ records): 28 hours
- Customer GST Master: 20 hours
- Vehicle Type Master: 12 hours
- Vendor Master: 16 hours
- Company Master: 12 hours

### Phase 3: Operations Modules (180 hours)
- Order/Enquiry Management: 48 hours
- LR Entry System: 56 hours
- Financial calculations: 32 hours
- Status management: 24 hours
- Data validation: 20 hours

### Phase 4: Billing & Documentation (100 hours)
- Bill generation logic: 32 hours
- LR print template: 24 hours
- Bill print template: 24 hours
- GST calculations: 20 hours

### Phase 5: Integration & Testing (80 hours)
- Module integration: 24 hours
- Unit testing: 20 hours
- Integration testing: 20 hours
- Bug fixes: 16 hours

### Phase 6: Deployment & Documentation (60 hours)
- Production deployment: 16 hours
- User documentation: 20 hours
- Technical documentation: 16 hours
- Training materials: 8 hours

**Total Development Effort: 680 hours**

---

## Cost Estimation

### Development Costs

| Phase | Hours | Rate (USD/hour) | Cost (USD) |
|-------|-------|-----------------|------------|
| Phase 1: Foundation & Architecture | 120 | $50 | $6,000 |
| Phase 2: Master Data Modules | 140 | $50 | $7,000 |
| Phase 3: Operations Modules | 180 | $50 | $9,000 |
| Phase 4: Billing & Documentation | 100 | $50 | $5,000 |
| Phase 5: Integration & Testing | 80 | $50 | $4,000 |
| Phase 6: Deployment & Documentation | 60 | $50 | $3,000 |
| **Subtotal** | **680** | | **$34,000** |

### Infrastructure Costs (Annual)

| Service | Specification | Cost (USD/year) |
|---------|--------------|-----------------|
| Supabase Pro Plan | 8GB Database, 100GB Storage, 250GB Bandwidth | $3,000 |
| Domain & SSL | Custom domain with SSL certificate | $100 |
| CDN & Hosting | Production hosting with CDN | $600 |
| Backup & Monitoring | Automated backups and monitoring | $500 |
| **Infrastructure Subtotal** | | **$4,200** |

### Support & Maintenance (Annual)

| Service | Description | Cost (USD/year) |
|---------|-------------|-----------------|
| Technical Support | Email/phone support, bug fixes | $6,000 |
| Feature Updates | Minor enhancements and updates | $4,000 |
| Security Patches | Security updates and monitoring | $2,000 |
| **Support Subtotal** | | **$12,000** |

---

## Commercial Proposal Summary

### One-Time Development Cost

| Item | Amount (USD) |
|------|--------------|
| Total Development Effort (680 hours @ $50/hr) | $34,000 |
| Project Management & Coordination | $3,400 |
| **Base Development Cost** | **$37,400** |
| **Markup (30%)** | **$11,220** |
| **Total One-Time Cost** | **$48,620** |

### Annual Recurring Cost

| Item | Amount (USD/year) |
|------|-------------------|
| Infrastructure (Supabase, Hosting, etc.) | $4,200 |
| Support & Maintenance | $12,000 |
| **Total Annual Cost** | **$16,200** |

### Payment Terms

**Development Phase:**
- 30% upon project initiation: $14,586
- 40% upon completion of Phases 1-3: $19,448
- 30% upon final delivery and acceptance: $14,586

**Annual Subscription:**
- Quarterly payments of $4,050
- OR Annual upfront payment with 10% discount: $14,580

---

## Project Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | 3 weeks | Database schema, Authentication, UI framework |
| Phase 2 | 3.5 weeks | All master data modules operational |
| Phase 3 | 4.5 weeks | Order/Enquiry and LR management |
| Phase 4 | 2.5 weeks | Bill generation and printing |
| Phase 5 | 2 weeks | Testing and bug fixes |
| Phase 6 | 1.5 weeks | Deployment and documentation |
| **Total** | **17 weeks** | Fully functional TMS system |

---

## Technical Advantages

### 1. Scalability
- Cloud-native architecture
- Horizontal scaling capability
- Handles 10,000+ concurrent users
- Database can scale to millions of records

### 2. Performance
- Optimized database queries with indexes
- Lazy loading for large datasets
- CDN for fast asset delivery
- Sub-second page load times

### 3. Reliability
- 99.9% uptime SLA
- Automated backups (every 6 hours)
- Disaster recovery plan
- Point-in-time recovery

### 4. Maintainability
- Clean code architecture
- Comprehensive documentation
- Modular design for easy updates
- TypeScript for type safety

### 5. User Experience
- Intuitive interface
- Mobile-responsive design
- Minimal training required
- Search and filter on all screens

---

## Future Enhancement Roadmap (Optional Add-ons)

### Phase 7: Advanced Features (Quote on Request)
- **SMS/Email Notifications:** Automated alerts for status updates
- **Mobile App:** Native iOS/Android applications
- **GPS Tracking:** Real-time vehicle tracking integration
- **WhatsApp Integration:** Document sharing via WhatsApp
- **Advanced Reports:** 20+ customizable reports with charts
- **Multi-language Support:** Hindi, English, and regional languages
- **E-Way Bill Integration:** Automatic e-way bill generation
- **Payment Gateway:** Online payment acceptance
- **Dashboard Analytics:** Visual analytics and KPIs
- **API Access:** Third-party integration capability

### Estimated Cost for Phase 7
- Development: $25,000 - $45,000 (based on features selected)
- Additional infrastructure: $2,000/year

---

## Terms & Conditions

### 1. Scope of Work
- All features listed in "Functional Modules" section
- Support for 100 concurrent users
- 100,000 records initial capacity
- Training for up to 10 users

### 2. Client Responsibilities
- Provide timely feedback during development
- Assign a dedicated point of contact
- Provide test data and business rules
- Arrange user acceptance testing

### 3. Intellectual Property
- Source code ownership transfers to client upon final payment
- Client receives full access to database and hosting
- We retain the right to use the architecture for other projects (without client data)

### 4. Warranty
- 90-day bug fix warranty post-deployment
- Free technical support for first 3 months
- Guaranteed response time: 24 hours for critical issues

### 5. Limitations
- Does not include third-party service costs (SMS, payment gateway fees)
- Custom hardware requirements not included
- On-site support charged separately

---

## Why Choose This Solution?

### 1. Modern Technology Stack
Built with latest technologies ensuring longevity and easy maintenance.

### 2. GST Compliant
Fully compliant with Indian GST regulations including state-wise tax calculations.

### 3. Scalable Architecture
Grows with your business from 100 to 100,000+ transactions.

### 4. Data Security
Enterprise-grade security with role-based access and encryption.

### 5. Cost Effective
No expensive servers or IT staff required. Cloud-based infrastructure reduces overhead.

### 6. Quick Deployment
Go live in 17 weeks with full functionality.

### 7. Ongoing Support
Dedicated support team for technical assistance and updates.

---

## Acceptance

This proposal is valid for 30 days from the date of submission.

**Prepared by:** [Your Company Name]
**Date:** January 6, 2026
**Version:** 1.0

---

### Contact Information

For questions or clarifications regarding this proposal, please contact:

**Email:** [your-email@company.com]
**Phone:** [your-phone-number]
**Website:** [your-website.com]

---

**Client Acceptance:**

By signing below, the client agrees to the terms, conditions, and pricing outlined in this proposal.

Client Name: _______________________________

Signature: _______________________________

Date: _______________________________

---

*This proposal is confidential and proprietary. It may not be reproduced or distributed without written permission.*
