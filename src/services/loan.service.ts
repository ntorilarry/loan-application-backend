import pool from "../database/connection"
import type { Loan, ApproveLoanRequest, LoanWithClient, StructuredLoanResponse, DisburseLoanRequest } from "../models/loan.model"
import type { Client, CreateClientRequest, UpdateClientRequest } from "../models/client.model"
import { LOAN_STATUS, PAYMENT_MODE } from "../common/constants"
import NotificationService from ".//notification.service"

class LoanService {
  // Phase 1: Registration
  async registerLoan(clientData: CreateClientRequest, userId: number): Promise<{ client: Client; loan: Loan }> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Create client
      const clientResult = await client.query(
        `INSERT INTO clients (fullname, contact, email, location, landmark, business, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          clientData.fullname,
          clientData.contact,
          clientData.email,
          clientData.location,
          clientData.landmark,
          clientData.business,
          userId,
        ],
      )

      const newClient = clientResult.rows[0]

      // Create loan in registration phase
      const loanResult = await client.query(
        `INSERT INTO loans (client_id, requested_amount, status, phase, registered_by, registration_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [newClient.id, clientData.requested_amount, LOAN_STATUS.REGISTERED, 1, userId],
      )

      const loan = loanResult.rows[0]

      await client.query("COMMIT")

      return { client: newClient, loan }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  // Phase 2: Capturing (detailed information collection)
  async captureLoanDetails(loanId: number, clientDetails: UpdateClientRequest, userId: number): Promise<LoanWithClient> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get loan and verify it's in registration or capturing phase
      const loanResult = await client.query("SELECT * FROM loans WHERE id = $1 AND phase IN (1, 2)", [loanId])

      if (loanResult.rows.length === 0) {
        throw new Error("Loan not found or not in registration/capturing phase")
      }

      const loan = loanResult.rows[0]

      // Update client with detailed information
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (clientDetails.dob) {
        updateFields.push(`dob = $${paramIndex++}`)
        updateValues.push(clientDetails.dob)
      }
      if (clientDetails.marital_status) {
        updateFields.push(`marital_status = $${paramIndex++}`)
        updateValues.push(clientDetails.marital_status)
      }
      if (clientDetails.profile_image) {
        updateFields.push(`profile_image = $${paramIndex++}`)
        updateValues.push(clientDetails.profile_image)
      }
      if (clientDetails.occupation) {
        updateFields.push(`occupation = $${paramIndex++}`)
        updateValues.push(clientDetails.occupation)
      }
      if (clientDetails.id_type) {
        updateFields.push(`id_type = $${paramIndex++}`)
        updateValues.push(clientDetails.id_type)
      }
      if (clientDetails.id_number) {
        updateFields.push(`id_number = $${paramIndex++}`)
        updateValues.push(clientDetails.id_number)
      }
      if (clientDetails.id_front_image) {
        updateFields.push(`id_front_image = $${paramIndex++}`)
        updateValues.push(clientDetails.id_front_image)
      }
      if (clientDetails.id_back_image) {
        updateFields.push(`id_back_image = $${paramIndex++}`)
        updateValues.push(clientDetails.id_back_image)
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
        const updateQuery = `UPDATE clients SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`
        updateValues.push(loan.client_id)
        await client.query(updateQuery, updateValues)
      }

      // Clear existing witnesses and add new ones
      if (clientDetails.witnesses && clientDetails.witnesses.length > 0) {
        // Delete existing witnesses
        await client.query("DELETE FROM client_witnesses WHERE client_id = $1", [loan.client_id])
        
        for (const witness of clientDetails.witnesses) {
          await client.query(
            `INSERT INTO client_witnesses (client_id, fullname, contact, marital_status, email, occupation, residence_address, residence_gps, id_type, id_number, id_front_image, id_back_image, profile_pic)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              loan.client_id,
              witness.fullname,
              witness.contact,
              witness.marital_status,
              witness.email,
              witness.occupation,
              witness.residence_address,
              witness.residence_gps,
              witness.id_type,
              witness.id_number,
              witness.id_front_image,
              witness.id_back_image,
              witness.profile_pic,
            ],
          )
        }
      }

      // Clear existing business locations and add new ones
      if (clientDetails.business_locations && clientDetails.business_locations.length > 0) {
        // Delete existing business locations
        await client.query("DELETE FROM business_locations WHERE client_id = $1", [loan.client_id])
        
        for (const location of clientDetails.business_locations) {
          await client.query(
            `INSERT INTO business_locations (client_id, name, address, gps_address, region)
             VALUES ($1, $2, $3, $4, $5)`,
            [loan.client_id, location.name, location.address, location.gps_address, location.region],
          )
        }
      }

      // Clear existing residences and add new ones
      if (clientDetails.residences && clientDetails.residences.length > 0) {
        // Delete existing residences
        await client.query("DELETE FROM residences WHERE client_id = $1", [loan.client_id])
        
        for (const residence of clientDetails.residences) {
          await client.query(
            `INSERT INTO residences (client_id, name, address, gps_address, region)
             VALUES ($1, $2, $3, $4, $5)`,
            [loan.client_id, residence.name, residence.address, residence.gps_address, residence.region],
          )
        }
      }

      // Update loan to capturing phase (only if not already in capturing phase)
      const updatedLoanResult = await client.query(
        `UPDATE loans SET status = $1, phase = $2, captured_by = $3, capturing_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND phase < 2 RETURNING *`,
        [LOAN_STATUS.CAPTURED, 2, userId, loanId],
      )

      await client.query("COMMIT")

      const detailed = await this.getLoanById(loanId)
      if (!detailed) {
        throw new Error("Loan not found after update")
      }
      return detailed
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  // Phase 3: Approval
  async approveLoan(loanId: number, approvalData: ApproveLoanRequest, userId: number): Promise<LoanWithClient> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get loan and verify it's in capturing phase
      const loanResult = await client.query("SELECT * FROM loans WHERE id = $1 AND phase = 2", [loanId])

      if (loanResult.rows.length === 0) {
        throw new Error("Loan not found or not in capturing phase")
      }

      // Update loan to approval phase
      const updatedLoanResult = await client.query(
        `UPDATE loans SET 
         status = $1, phase = $2, approved_amount = $3, loan_duration = $4, 
         payment_mode = $5, payment_schedule_start = $6, approved_by = $7, 
         approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
         payment_start_date = $8, payment_end_date = $9, processing_fee = $10, interest_rate = $11
         WHERE id = $12 RETURNING *`,
        [
          LOAN_STATUS.APPROVED,
          3,
          approvalData.approved_amount,
          approvalData.loan_duration,
          approvalData.payment_mode,
          approvalData.payment_start_date,
          userId,
          approvalData.payment_start_date,
          approvalData.payment_end_date,
          approvalData.processing_fee,
          approvalData.interest_rate,
          loanId,
        ],
      )

      // Generate repayment schedule
      await this.generateRepaymentSchedule(loanId, approvalData, approvalData.payment_start_date, client)

      await client.query("COMMIT")

      await NotificationService.sendLoanApprovalNotification(loanId)

      const detailed = await this.getLoanById(loanId)
      if (!detailed) {
        throw new Error("Loan not found after approval")
      }
      return detailed
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  // Phase 4: Disbursement
  async disburseLoan(loanId: number, disbursementData: DisburseLoanRequest, userId: number): Promise<LoanWithClient> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get loan and verify it's in approval phase
      const loanResult = await client.query("SELECT * FROM loans WHERE id = $1 AND phase = 3", [loanId])

      if (loanResult.rows.length === 0) {
        throw new Error("Loan not found or not in approval phase")
      }

      // Update loan to disbursement phase and active status
      const updatedLoanResult = await client.query(
        `UPDATE loans SET 
         status = $1, phase = $2, disbursed_by = $3, 
         disbursement_method = $4, disbursement_notes = $5,
         disbursement_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [LOAN_STATUS.ACTIVE, 4, userId, disbursementData.disbursement_method, disbursementData.disbursement_notes, loanId],
      )

      await client.query("COMMIT")

      await NotificationService.sendLoanDisbursementNotification(loanId)

      const detailed = await this.getLoanById(loanId)
      if (!detailed) {
        throw new Error("Loan not found after disbursement")
      }
      return detailed
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  private async generateRepaymentSchedule(
    loanId: number,
    approvalData: ApproveLoanRequest,
    startDate: string,
    client: any,
  ): Promise<void> {
    const { approved_amount, loan_duration, payment_mode } = approvalData
    const duration = Number.parseInt(loan_duration)
    const installmentAmount = approved_amount / duration

    for (let i = 0; i < duration; i++) {
      const startDateObj = new Date(startDate)
      const dueDate = new Date(startDateObj)

      if (payment_mode === PAYMENT_MODE.WEEKLY) {
        dueDate.setDate(startDateObj.getDate() + i * 7)
      } else {
        dueDate.setMonth(startDateObj.getMonth() + i)
      }

      await client.query(
        `INSERT INTO loan_repayments (loan_id, amount, due_date, payment_date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [loanId, installmentAmount, dueDate, dueDate, "pending"],
      )
    }
  }

  async getLoansWithFilters(filters: {
    status?: string
    phase?: number
    page?: number
    limit?: number
    search?: string
    userId?: number
    userRole?: string
  }): Promise<{ loans: any[]; total: number; totalPages: number; stats: { total_registrations: number; registered: number; captured: number; total_requested: number } }> {
    const { status, phase, page = 1, limit = 10, search, userId, userRole } = filters
    const offset = (page - 1) * limit

    let query = `
      SELECT l.*, c.fullname as client_name, c.contact as client_contact, c.email as client_email,
             c.location as client_location, c.landmark as client_landmark, c.business as client_business,
             c.dob, c.marital_status, c.profile_image, c.occupation, c.id_type, c.id_number,
             c.id_front_image, c.id_back_image,
             u1.fullname as registered_by_name, u2.fullname as captured_by_name,
             u3.fullname as approved_by_name, u4.fullname as disbursed_by_name,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', cw.id,
                   'fullname', cw.fullname,
                   'contact', cw.contact,
                   'marital_status', cw.marital_status,
                   'email', cw.email,
                   'occupation', cw.occupation,
                   'residence_address', cw.residence_address,
                   'residence_gps', cw.residence_gps,
                   'id_type', cw.id_type,
                   'id_number', cw.id_number,
                   'id_front_image', cw.id_front_image,
                   'id_back_image', cw.id_back_image,
                   'profile_pic', cw.profile_pic
                 )
               ) FILTER (WHERE cw.id IS NOT NULL), 
               '[]'
             ) as witnesses,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', bl.id,
                   'name', bl.name,
                   'address', bl.address,
                   'gps_address', bl.gps_address,
                   'region', bl.region
                 )
               ) FILTER (WHERE bl.id IS NOT NULL), 
               '[]'
             ) as business_locations,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', r.id,
                   'name', r.name,
                   'address', r.address,
                   'gps_address', r.gps_address,
                   'region', r.region
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'
             ) as residences
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      LEFT JOIN users u1 ON l.registered_by = u1.id
      LEFT JOIN users u2 ON l.captured_by = u2.id
      LEFT JOIN users u3 ON l.approved_by = u3.id
      LEFT JOIN users u4 ON l.disbursed_by = u4.id
      LEFT JOIN client_witnesses cw ON c.id = cw.client_id
      LEFT JOIN business_locations bl ON c.id = bl.client_id
      LEFT JOIN residences r ON c.id = r.client_id
      WHERE 1=1
    `

    let countQuery = `
      SELECT COUNT(*) FROM loans l
      JOIN clients c ON l.client_id = c.id
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // Role-based filtering
    if (userRole === "Call Center") {
      query += ` AND l.phase = 1`
      countQuery += ` AND l.phase = 1`
    } else if (userRole === "Sales Executive" || userRole === "Loan Officer") {
      query += ` AND l.phase IN (1, 2)`
      countQuery += ` AND l.phase IN (1, 2)`
    } else if (userRole === "Credit Risk Analyst") {
      query += ` AND l.phase = 2`
      countQuery += ` AND l.phase = 2`
    } else if (userRole === "Manager") {
      query += ` AND l.phase = 3`
      countQuery += ` AND l.phase = 3`
    }

    if (status) {
      query += ` AND l.status = $${paramIndex}`
      countQuery += ` AND l.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    if (phase) {
      query += ` AND l.phase = $${paramIndex}`
      countQuery += ` AND l.phase = $${paramIndex}`
      queryParams.push(phase)
      paramIndex++
    }

    if (search) {
      query += ` AND (c.fullname ILIKE $${paramIndex} OR c.contact ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`
      countQuery += ` AND (c.fullname ILIKE $${paramIndex} OR c.contact ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    query += ` GROUP BY l.id, c.id, u1.fullname, u2.fullname, u3.fullname, u4.fullname ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Build stats query (ignore status/phase filters so user can see breakdown under current scope)
    let statsQuery = `
      SELECT 
        COUNT(*)::int as total_registrations,
        COUNT(*) FILTER (WHERE l.status = '${LOAN_STATUS.REGISTERED}')::int as registered,
        COUNT(*) FILTER (WHERE l.status = '${LOAN_STATUS.CAPTURED}')::int as captured,
        COALESCE(SUM(l.requested_amount), 0)::numeric as total_requested
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      WHERE 1=1
    `

    const statsParams: any[] = []

    // Apply only role-based and search scopes to stats
    if (userRole === "Call Center") {
      statsQuery += ` AND l.phase = 1`
    } else if (userRole === "Sales Executive" || userRole === "Loan Officer") {
      statsQuery += ` AND l.phase IN (1, 2)`
    } else if (userRole === "Credit Risk Analyst") {
      statsQuery += ` AND l.phase = 2`
    } else if (userRole === "Manager") {
      statsQuery += ` AND l.phase = 3`
    }

    if (search) {
      statsQuery += ` AND (c.fullname ILIKE $1 OR c.contact ILIKE $1 OR c.email ILIKE $1)`
      statsParams.push(`%${search}%`)
    }

    const [loansResult, countResult, statsResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
      pool.query(statsQuery, statsParams),
    ])

    const total = Number.parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(total / limit)

    const statsRow = statsResult.rows[0] || { total_registrations: 0, registered: 0, captured: 0, total_requested: 0 }

    // Restructure loans data with clear sections
    const structuredLoans = loansResult.rows.map((loan: any) => {
      return {
        id: loan.id,
        registered: {
          client_id: loan.client_id,
          client_name: loan.client_name,
          client_contact: loan.client_contact,
          client_email: loan.client_email,
          client_location: loan.client_location,
          client_landmark: loan.client_landmark,
          client_business: loan.client_business,
          requested_amount: loan.requested_amount,
          registered_by: loan.registered_by,
          registered_by_name: loan.registered_by_name,
          registration_date: loan.registration_date,
        },
        captured: {
          captured_by: loan.captured_by,
          captured_by_name: loan.captured_by_name,
          capturing_date: loan.capturing_date,
          dob: loan.dob,
          marital_status: loan.marital_status,
          occupation: loan.occupation,
          profile_image: loan.profile_image,
          id_type: loan.id_type,
          id_number: loan.id_number,
          id_front_image: loan.id_front_image,
          id_back_image: loan.id_back_image,
          witnesses: loan.witnesses || [],
          business_locations: loan.business_locations || [],
          residences: loan.residences || [],
        },
        approved: {
          approved_amount: loan.approved_amount,
          loan_duration: loan.loan_duration,
          payment_mode: loan.payment_mode,
          processing_fee: loan.processing_fee,
          interest_rate: loan.interest_rate,
          payment_start_date: loan.payment_start_date,
          payment_end_date: loan.payment_end_date,
          approved_by: loan.approved_by,
          approved_by_name: loan.approved_by_name,
          approval_date: loan.approval_date,
        },
        disbursement: {
          disbursed_by: loan.disbursed_by,
          disbursed_by_name: loan.disbursed_by_name,
          disbursement_date: loan.disbursement_date,
          disbursement_method: loan.disbursement_method,
          disbursement_notes: loan.disbursement_notes,
        },
        loan_status: {
          status: loan.status,
          phase: loan.phase,
          payment_schedule_start: loan.payment_schedule_start,
        },
        created_at: loan.created_at,
        updated_at: loan.updated_at,
      }
    })

    return {
      loans: structuredLoans,
      total,
      totalPages,
      stats: {
        total_registrations: Number.parseInt(statsRow.total_registrations as unknown as string),
        registered: Number.parseInt(statsRow.registered as unknown as string),
        captured: Number.parseInt(statsRow.captured as unknown as string),
        total_requested: Number(statsRow.total_requested),
      },
    }
  }

  async getLoanById(loanId: number): Promise<LoanWithClient | null> {
    const result = await pool.query(
      `
      SELECT l.*, c.fullname as client_name, c.contact as client_contact, c.email as client_email,
             c.location as client_location, c.business as client_business, c.dob, c.marital_status,
             c.profile_image, c.occupation, c.id_type, c.id_number,
             c.id_front_image, c.id_back_image,
             u1.fullname as registered_by_name, u2.fullname as captured_by_name,
             u3.fullname as approved_by_name, u4.fullname as disbursed_by_name,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', cw.id,
                   'fullname', cw.fullname,
                   'contact', cw.contact,
                   'marital_status', cw.marital_status,
                   'email', cw.email,
                   'occupation', cw.occupation,
                   'residence_address', cw.residence_address,
                   'residence_gps', cw.residence_gps,
                   'id_type', cw.id_type,
                   'id_number', cw.id_number,
                   'id_front_image', cw.id_front_image,
                   'id_back_image', cw.id_back_image,
                   'profile_pic', cw.profile_pic
                 )
               ) FILTER (WHERE cw.id IS NOT NULL), 
               '[]'
             ) as witnesses,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', bl.id,
                   'name', bl.name,
                   'address', bl.address,
                   'gps_address', bl.gps_address,
                   'region', bl.region
                 )
               ) FILTER (WHERE bl.id IS NOT NULL), 
               '[]'
             ) as business_locations,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', r.id,
                   'name', r.name,
                   'address', r.address,
                   'gps_address', r.gps_address,
                   'region', r.region
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'
             ) as residences
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      LEFT JOIN users u1 ON l.registered_by = u1.id
      LEFT JOIN users u2 ON l.captured_by = u2.id
      LEFT JOIN users u3 ON l.approved_by = u3.id
      LEFT JOIN users u4 ON l.disbursed_by = u4.id
      LEFT JOIN client_witnesses cw ON c.id = cw.client_id
      LEFT JOIN business_locations bl ON c.id = bl.client_id
      LEFT JOIN residences r ON c.id = r.client_id
      WHERE l.id = $1
      GROUP BY l.id, c.id, u1.fullname, u2.fullname, u3.fullname, u4.fullname
    `,
      [loanId],
    )

    return result.rows.length > 0 ? result.rows[0] : null
  }

  async getStructuredLoanById(loanId: number): Promise<StructuredLoanResponse | null> {
    const result = await pool.query(
      `
      SELECT l.*, c.fullname as client_name, c.contact as client_contact, c.email as client_email,
             c.location as client_location, c.landmark as client_landmark, c.business as client_business,
             c.dob, c.marital_status, c.profile_image, c.occupation, c.id_type, c.id_number,
             c.id_front_image, c.id_back_image,
             u1.fullname as registered_by_name, u2.fullname as captured_by_name,
             u3.fullname as approved_by_name, u4.fullname as disbursed_by_name,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', cw.id,
                   'fullname', cw.fullname,
                   'contact', cw.contact,
                   'marital_status', cw.marital_status,
                   'email', cw.email,
                   'occupation', cw.occupation,
                   'residence_address', cw.residence_address,
                   'residence_gps', cw.residence_gps,
                   'id_type', cw.id_type,
                   'id_number', cw.id_number,
                   'id_front_image', cw.id_front_image,
                   'id_back_image', cw.id_back_image,
                   'profile_pic', cw.profile_pic
                 )
               ) FILTER (WHERE cw.id IS NOT NULL), 
               '[]'
             ) as witnesses,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', bl.id,
                   'name', bl.name,
                   'address', bl.address,
                   'gps_address', bl.gps_address,
                   'region', bl.region
                 )
               ) FILTER (WHERE bl.id IS NOT NULL), 
               '[]'
             ) as business_locations,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', r.id,
                   'name', r.name,
                   'address', r.address,
                   'gps_address', r.gps_address,
                   'region', r.region
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'
             ) as residences
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      LEFT JOIN users u1 ON l.registered_by = u1.id
      LEFT JOIN users u2 ON l.captured_by = u2.id
      LEFT JOIN users u3 ON l.approved_by = u3.id
      LEFT JOIN users u4 ON l.disbursed_by = u4.id
      LEFT JOIN client_witnesses cw ON c.id = cw.client_id
      LEFT JOIN business_locations bl ON c.id = bl.client_id
      LEFT JOIN residences r ON c.id = r.client_id
      WHERE l.id = $1
      GROUP BY l.id, c.id, u1.fullname, u2.fullname, u3.fullname, u4.fullname
    `,
      [loanId],
    )

    if (result.rows.length === 0) {
      return null
    }

    const loan = result.rows[0]

    // Restructure loan data with clear sections (same as getLoansWithFilters)
    return {
      id: loan.id,
      registered: {
        client_id: loan.client_id,
        client_name: loan.client_name,
        client_contact: loan.client_contact,
        client_email: loan.client_email,
        client_location: loan.client_location,
        client_landmark: loan.client_landmark,
        client_business: loan.client_business,
        requested_amount: loan.requested_amount,
        registered_by: loan.registered_by,
        registered_by_name: loan.registered_by_name,
        registration_date: loan.registration_date,
      },
      captured: {
        captured_by: loan.captured_by,
        captured_by_name: loan.captured_by_name,
        capturing_date: loan.capturing_date,
        dob: loan.dob,
        marital_status: loan.marital_status,
        occupation: loan.occupation,
        profile_image: loan.profile_image,
        id_type: loan.id_type,
        id_number: loan.id_number,
        id_front_image: loan.id_front_image,
        id_back_image: loan.id_back_image,
        witnesses: loan.witnesses || [],
        business_locations: loan.business_locations || [],
        residences: loan.residences || [],
      },
      approved: {
        approved_amount: loan.approved_amount,
        loan_duration: loan.loan_duration,
        payment_mode: loan.payment_mode,
        processing_fee: loan.processing_fee,
        interest_rate: loan.interest_rate,
        payment_start_date: loan.payment_start_date,
        payment_end_date: loan.payment_end_date,
        approved_by: loan.approved_by,
        approved_by_name: loan.approved_by_name,
        approval_date: loan.approval_date,
      },
      disbursement: {
        disbursed_by: loan.disbursed_by,
        disbursed_by_name: loan.disbursed_by_name,
        disbursement_date: loan.disbursement_date,
        disbursement_method: loan.disbursement_method,
        disbursement_notes: loan.disbursement_notes,
      },
      loan_status: {
        status: loan.status,
        phase: loan.phase,
        payment_schedule_start: loan.payment_schedule_start,
      },
      created_at: loan.created_at,
      updated_at: loan.updated_at,
    }
  }

  async recordRepayment(loanId: number, amount: number, paymentDate: Date, userId: number, notes?: string): Promise<{ remainingBalance: number; totalPaid: number; nextDueAmount: number }> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get loan details
      const loanResult = await client.query(
        `SELECT approved_amount, status FROM loans WHERE id = $1`,
        [loanId]
      )

      if (loanResult.rows.length === 0) {
        throw new Error("Loan not found")
      }

      const loan = loanResult.rows[0]

      // Record the payment
      await client.query(
        `INSERT INTO loan_payments (loan_id, amount, payment_date, received_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [loanId, amount, paymentDate, userId, notes || null]
      )

      // Calculate total paid amount
      const totalPaidResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid FROM loan_payments WHERE loan_id = $1`,
        [loanId]
      )

      const totalPaid = Number(totalPaidResult.rows[0].total_paid)
      const remainingBalance = Number(loan.approved_amount) - totalPaid

      // Update repayment schedule based on payments
      await this.updateRepaymentSchedule(loanId, totalPaid, client)

      // Check if loan is fully paid
      if (remainingBalance <= 0) {
        await client.query(
          `UPDATE loans SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [LOAN_STATUS.COMPLETED, loanId],
        )
      }

      // Get next due amount
      const nextDueResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as next_due FROM loan_repayments 
         WHERE loan_id = $1 AND status = 'pending'`,
        [loanId]
      )

      const nextDueAmount = Number(nextDueResult.rows[0].next_due)

      await client.query("COMMIT")

      return {
        remainingBalance: Math.max(0, remainingBalance),
        totalPaid,
        nextDueAmount
      }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  private async updateRepaymentSchedule(loanId: number, totalPaid: number, client: any): Promise<void> {
    // Get all pending repayments ordered by due date
    const repaymentsResult = await client.query(
      `SELECT * FROM loan_repayments 
       WHERE loan_id = $1 AND status IN ('pending', 'partial')
       ORDER BY due_date ASC`,
      [loanId]
    )

    let remainingToAllocate = totalPaid

    for (const repayment of repaymentsResult.rows) {
      if (remainingToAllocate <= 0) break

      const amountNeeded = Number(repayment.amount)
      const amountToAllocate = Math.min(remainingToAllocate, amountNeeded)
      
      remainingToAllocate -= amountToAllocate

      if (amountToAllocate >= amountNeeded) {
        // Fully paid
        await client.query(
          `UPDATE loan_repayments 
           SET status = 'paid', payment_date = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [repayment.id]
        )
      } else {
        // Partially paid
        await client.query(
          `UPDATE loan_repayments 
           SET status = 'partial', payment_date = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [repayment.id]
        )
      }
    }
  }

  async getLoanRepayments(loanId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT lr.*, u.fullname as received_by_name
       FROM loan_repayments lr
       LEFT JOIN users u ON lr.received_by = u.id
       WHERE lr.loan_id = $1
       ORDER BY lr.due_date ASC`,
      [loanId],
    )

    return result.rows
  }

  async getLoanPayments(loanId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT lp.*, u.fullname as received_by_name
       FROM loan_payments lp
       LEFT JOIN users u ON lp.received_by = u.id
       WHERE lp.loan_id = $1
       ORDER BY lp.payment_date DESC`,
      [loanId],
    )

    return result.rows
  }

  async getLoanBalance(loanId: number): Promise<{ totalAmount: number; totalPaid: number; remainingBalance: number; nextDueAmount: number }> {
    const result = await pool.query(
      `SELECT 
         l.approved_amount as total_amount,
         COALESCE(SUM(lp.amount), 0) as total_paid
       FROM loans l
       LEFT JOIN loan_payments lp ON l.id = lp.loan_id
       WHERE l.id = $1
       GROUP BY l.id, l.approved_amount`,
      [loanId],
    )

    if (result.rows.length === 0) {
      throw new Error("Loan not found")
    }

    const totalAmount = Number(result.rows[0].total_amount)
    const totalPaid = Number(result.rows[0].total_paid)
    const remainingBalance = Math.max(0, totalAmount - totalPaid)

    // Get next due amount
    const nextDueResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as next_due FROM loan_repayments 
       WHERE loan_id = $1 AND status = 'pending'`,
      [loanId],
    )

    const nextDueAmount = Number(nextDueResult.rows[0].next_due)

    return {
      totalAmount,
      totalPaid,
      remainingBalance,
      nextDueAmount
    }
  }

  async editLoan(loanId: number, loanData: any, userId: number): Promise<LoanWithClient> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get loan and verify it's in registration or capturing phase
      const loanResult = await client.query("SELECT * FROM loans WHERE id = $1 AND phase IN (1, 2)", [loanId])

      if (loanResult.rows.length === 0) {
        throw new Error("Loan not found or not in registration/capturing phase")
      }

      const loan = loanResult.rows[0]

      // Update client information
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (loanData.fullname) {
        updateFields.push(`fullname = $${paramIndex++}`)
        updateValues.push(loanData.fullname)
      }
      if (loanData.contact) {
        updateFields.push(`contact = $${paramIndex++}`)
        updateValues.push(loanData.contact)
      }
      if (loanData.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`)
        updateValues.push(loanData.email)
      }
      if (loanData.location) {
        updateFields.push(`location = $${paramIndex++}`)
        updateValues.push(loanData.location)
      }
      if (loanData.landmark !== undefined) {
        updateFields.push(`landmark = $${paramIndex++}`)
        updateValues.push(loanData.landmark)
      }
      if (loanData.business !== undefined) {
        updateFields.push(`business = $${paramIndex++}`)
        updateValues.push(loanData.business)
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
        const updateQuery = `UPDATE clients SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`
        updateValues.push(loan.client_id)
        await client.query(updateQuery, updateValues)
      }

      // Update loan requested amount if provided
      if (loanData.requested_amount) {
        await client.query(
          `UPDATE loans SET requested_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [loanData.requested_amount, loanId]
        )
      }

      await client.query("COMMIT")

      const detailed = await this.getLoanById(loanId)
      if (!detailed) {
        throw new Error("Loan not found after update")
      }
      return detailed
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  async deleteLoan(loanId: number, userId: number): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get loan and verify it's in registration or capturing phase
      const loanResult = await client.query("SELECT * FROM loans WHERE id = $1 AND phase IN (1, 2)", [loanId])

      if (loanResult.rows.length === 0) {
        throw new Error("Loan not found or not in registration/capturing phase")
      }

      const loan = loanResult.rows[0]

      // Delete related data first (due to foreign key constraints)
      await client.query("DELETE FROM client_witnesses WHERE client_id = $1", [loan.client_id])
      await client.query("DELETE FROM business_locations WHERE client_id = $1", [loan.client_id])
      await client.query("DELETE FROM residences WHERE client_id = $1", [loan.client_id])
      
      // Delete the loan
      await client.query("DELETE FROM loans WHERE id = $1", [loanId])
      
      // Delete the client
      await client.query("DELETE FROM clients WHERE id = $1", [loan.client_id])

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }
}

export default new LoanService()
