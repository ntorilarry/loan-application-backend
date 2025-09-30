import pool from "../database/connection";

interface ClientStats {
  total_clients: number;
  active_clients: number;
  new_clients_this_month: number;
}

interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  employees_by_role: Array<{
    role_name: string;
    count: number;
  }>;
}

class DashboardService {
  async getClientStats(): Promise<ClientStats> {
    const query = `
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_clients_this_month
      FROM clients
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      total_clients: Number.parseInt(stats.total_clients),
      active_clients: Number.parseInt(stats.active_clients),
      new_clients_this_month: Number.parseInt(stats.new_clients_this_month),
    };
  }

  async getEmployeeStats(): Promise<EmployeeStats> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees
      FROM users
      WHERE role_id IS NOT NULL
    `;

    const roleQuery = `
      SELECT r.name as role_name, COUNT(u.id) as count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id AND u.status = 'active'
      GROUP BY r.id, r.name
      ORDER BY count DESC
    `;

    const [statsResult, roleResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(roleQuery),
    ]);

    const stats = statsResult.rows[0];

    return {
      total_employees: Number.parseInt(stats.total_employees),
      active_employees: Number.parseInt(stats.active_employees),
      employees_by_role: roleResult.rows.map((row) => ({
        role_name: row.role_name,
        count: Number.parseInt(row.count),
      })),
    };
  }

  async getComprehensiveDashboard() {
    const [dashboardStats, clientStats, employeeStats] = await Promise.all([
      this.getDashboardStats(),
      this.getClientStats(),
      this.getEmployeeStats(),
    ]);

    return {
      ...dashboardStats,
      client_stats: clientStats,
      employee_stats: employeeStats,
    };
  }

  private async getDashboardStats() {
    // Get basic loan counts
    const loanStatsQuery = `
      SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_loans,
        COUNT(CASE WHEN phase = 1 THEN 1 END) as registration_phase,
        COUNT(CASE WHEN phase = 2 THEN 1 END) as capturing_phase,
        COUNT(CASE WHEN phase = 3 THEN 1 END) as approval_phase,
        COUNT(CASE WHEN phase = 4 AND status != 'active' THEN 1 END) as disbursement_phase,
        COALESCE(SUM(CASE WHEN status IN ('active', 'completed') THEN approved_amount END), 0) as total_disbursed
      FROM loans
    `;

    const loanStatsResult = await pool.query(loanStatsQuery);
    const loanStats = loanStatsResult.rows[0];

    // Get total collected amount
    const collectedQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_collected
      FROM loan_repayments
      WHERE status = 'paid'
    `;

    const collectedResult = await pool.query(collectedQuery);
    const totalCollected = Number.parseFloat(
      collectedResult.rows[0].total_collected
    );

    // Get pending approvals and disbursements
    const pendingQuery = `
      SELECT 
        COUNT(CASE WHEN phase = 2 THEN 1 END) as pending_approvals,
        COUNT(CASE WHEN phase = 3 THEN 1 END) as pending_disbursements
      FROM loans
    `;

    const pendingResult = await pool.query(pendingQuery);
    const pending = pendingResult.rows[0];

    return {
      total_loans: Number.parseInt(loanStats.total_loans),
      active_loans: Number.parseInt(loanStats.active_loans),
      completed_loans: Number.parseInt(loanStats.completed_loans),
      defaulted_loans: Number.parseInt(loanStats.defaulted_loans),
      total_disbursed: Number.parseFloat(loanStats.total_disbursed),
      total_collected: totalCollected,
      pending_approvals: Number.parseInt(pending.pending_approvals),
      pending_disbursements: Number.parseInt(pending.pending_disbursements),
      loans_by_phase: {
        registration: Number.parseInt(loanStats.registration_phase),
        capturing: Number.parseInt(loanStats.capturing_phase),
        approval: Number.parseInt(loanStats.approval_phase),
        disbursement: Number.parseInt(loanStats.disbursement_phase),
      },
    };
  }
}

export default new DashboardService();
