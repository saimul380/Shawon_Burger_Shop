const { pool } = require('../db/config');

const Dashboard = {
    async getStats(startDate) {
        const client = await pool.connect();
        try {
            // Use CTEs for clarity and performance
            const query = `
                WITH PeriodOrders AS (
                    SELECT * FROM orders WHERE created_at >= $1
                ),
                Stats AS (
                    SELECT
                        (SELECT COUNT(*) FROM orders) AS "totalOrders",
                        (SELECT COUNT(*) FROM PeriodOrders) AS "periodOrders",
                        (SELECT SUM(total_amount) FROM orders) AS "totalRevenue",
                        (SELECT SUM(total_amount) FROM PeriodOrders) AS "periodRevenue"
                ),
                StatusCounts AS (
                    SELECT order_status, COUNT(*) as count
                    FROM orders
                    GROUP BY order_status
                ),
                PopularItems AS (
                    SELECT
                        oi.name,
                        SUM(oi.quantity) as count,
                        SUM(oi.price * oi.quantity) as revenue
                    FROM order_items oi
                    JOIN PeriodOrders po ON oi.order_id = po.id
                    GROUP BY oi.name
                    ORDER BY count DESC
                    LIMIT 5
                ),
                DailyStats AS (
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as orders,
                        SUM(total_amount) as revenue
                    FROM PeriodOrders
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                )
                SELECT 
                    (SELECT row_to_json(Stats) FROM Stats) as stats,
                    (SELECT json_agg(StatusCounts) FROM StatusCounts) as "statusCounts",
                    (SELECT json_agg(PopularItems) FROM PopularItems) as "popularItems",
                    (SELECT json_agg(DailyStats) FROM DailyStats) as "dailyStats";
            `;

            const result = await client.query(query, [startDate]);
            const data = result.rows[0];

            // Process and format the data
            const formattedStats = {
                totalOrders: data.stats.totalOrders || 0,
                periodOrders: data.stats.periodOrders || 0,
                totalRevenue: parseFloat(data.stats.totalRevenue) || 0,
                periodRevenue: parseFloat(data.stats.periodRevenue) || 0,
                orderStatusCounts: (data.statusCounts || []).reduce((acc, curr) => {
                    acc[curr.order_status] = parseInt(curr.count, 10);
                    return acc;
                }, {}),
                popularItems: (data.popularItems || []).map(item => ({
                    _id: item.name, // Keep _id for frontend compatibility
                    count: parseInt(item.count, 10),
                    revenue: parseFloat(item.revenue)
                })),
                dailyStats: (data.dailyStats || []).map(day => ({
                    _id: day.date, // Keep _id for frontend compatibility
                    orders: parseInt(day.orders, 10),
                    revenue: parseFloat(day.revenue)
                }))
            };

            return formattedStats;

        } finally {
            client.release();
        }
    }
};

module.exports = Dashboard;
