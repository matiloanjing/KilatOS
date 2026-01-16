
'use client';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface AnalyticsChartsProps {
    dailyStats: any[];
    modelStats: any[];
    tierBreakdown: any[];
}

export function DailyTrafficChart({ data }: { data: any[] }) {
    // Format data for chart
    const formattedData = [...data].reverse().map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: item.total_requests,
        users: item.unique_users
    }));

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 8 }} name="Requests" />
                    <Line type="monotone" dataKey="users" stroke="#06b6d4" strokeWidth={2} dot={false} name="Users" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ModelUsageChart({ data }: { data: any[] }) {
    const formattedData = data.slice(0, 5).map(item => ({
        name: item.model_used,
        usage: item.usage_count,
        cost: parseFloat(item.total_cost || 0)
    }));

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} width={100} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="usage" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Requests" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function TierDistributionChart({ data }: { data: any[] }) {
    const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="user_count"
                        nameKey="tier"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
