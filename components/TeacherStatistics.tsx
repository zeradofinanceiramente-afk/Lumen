
import React, { useState, useMemo } from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { ChartContainer, CustomTooltip, ChartGradients, PIE_COLORS } from './common/ChartComponents';

const StatCard: React.FC<{ title: string; value: string | number; description: string; icon: React.ReactNode; iconBgColor: string; iconTextColor: string }> = React.memo(({ title, value, description, icon, iconBgColor, iconTextColor }) => (
    <Card>
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300 hc-text-secondary">{title}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 hc-text-primary responsive-stat-value">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">{description}</p>
            </div>
            <div className={`p-3 rounded-full ${iconBgColor} ${iconTextColor}`}>
                {icon}
            </div>
        </div>
    </Card>
));

const TeacherStatistics: React.FC = () => {
    const { teacherClasses } = useTeacherClassContext();
    const [selectedClassId, setSelectedClassId] = useState('all');

    // --- Data Calculation Logic ---
    const stats = useMemo(() => {
        const filteredClasses = selectedClassId === 'all' 
            ? teacherClasses 
            : teacherClasses.filter(c => c.id === selectedClassId);

        const allStudents = filteredClasses.flatMap(c => c.students || []);
        const uniqueStudentIds = new Set(allStudents.map(s => s.id));
        const totalStudents = uniqueStudentIds.size;
        
        let totalScore = 0;
        let totalMaxScore = 0;
        
        // Data for Engagement Chart (Pie)
        let activeStudentsCount = 0;
        const studentIdsWithSubmissions = new Set<string>();

        // Data for Performance Chart (Bar)
        const classPerformanceMap: Record<string, { total: number, max: number, name: string }> = {};

        filteredClasses.forEach(c => {
            if (!classPerformanceMap[c.id]) {
                classPerformanceMap[c.id] = { total: 0, max: 0, name: c.name };
            }

            c.activities?.forEach(a => {
                if (a.submissions) {
                    a.submissions.forEach(s => {
                        studentIdsWithSubmissions.add(s.studentId);
                        
                        if (s.status === 'Corrigido' && typeof s.grade === 'number' && a.points > 0) {
                            totalScore += s.grade;
                            totalMaxScore += a.points;
                            
                            // Per class accumulation
                            classPerformanceMap[c.id].total += s.grade;
                            classPerformanceMap[c.id].max += a.points;
                        }
                    });
                }
            });
        });

        activeStudentsCount = studentIdsWithSubmissions.size;
        const averageActivityPerformance = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
        const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;
        const inactiveStudentsCount = Math.max(0, totalStudents - activeStudentsCount);

        // Prepare Chart Data
        const engagementData = [
            { name: 'Ativos', value: activeStudentsCount },
            { name: 'Sem Envios', value: inactiveStudentsCount }
        ];

        const performanceData = Object.values(classPerformanceMap).map(item => ({
            name: item.name,
            score: item.max > 0 ? Math.round((item.total / item.max) * 100) : 0
        })).sort((a, b) => b.score - a.score);

        return {
            totalStudents,
            averageActivityPerformance,
            activeStudents: activeStudentsCount,
            engagementRate,
            engagementData,
            performanceData
        };
    }, [teacherClasses, selectedClassId]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Estatísticas do Professor</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">Visão gráfica do desempenho das suas turmas</p>
                </div>
                <select 
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                    <option value="all">Todas as Turmas</option>
                    {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Alunos" value={stats.totalStudents} description="Em turmas selecionadas" icon={ICONS.students} iconBgColor="bg-blue-100 dark:bg-blue-500/20" iconTextColor="text-blue-600 dark:text-blue-300" />
                <StatCard title="Média Geral" value={`${stats.averageActivityPerformance}%`} description="Aproveitamento em atividades" icon={ICONS.stats_quiz} iconBgColor="bg-yellow-100 dark:bg-yellow-500/20" iconTextColor="text-yellow-600 dark:text-yellow-300" />
                <StatCard title="Alunos Ativos" value={stats.activeStudents} description="Enviaram atividades" icon={ICONS.stats_active} iconBgColor="bg-indigo-100 dark:bg-indigo-500/20" iconTextColor="text-indigo-600 dark:text-indigo-300" />
                <StatCard title="Taxa de Engajamento" value={`${stats.engagementRate}%`} description="Participação ativa" icon={ICONS.stats_engagement} iconBgColor="bg-red-100 dark:bg-red-500/20" iconTextColor="text-red-600 dark:text-red-300" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <ChartContainer title="Desempenho por Turma" subtitle="Média de aproveitamento (0-100) baseada nas correções.">
                        <BarChart data={stats.performanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <ChartGradients />
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#6B7280'}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                            <Bar 
                                dataKey="score" 
                                name="Média" 
                                fill="url(#gradIndigo)" 
                                radius={[0, 4, 4, 0]} 
                                barSize={24}
                                animationDuration={1500}
                            />
                        </BarChart>
                    </ChartContainer>
                </Card>

                <Card>
                    <ChartContainer title="Engajamento dos Alunos" subtitle="Proporção de alunos que realizaram atividades versus inativos.">
                        <PieChart>
                            <Pie
                                data={stats.engagementData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {stats.engagementData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#cbd5e1'} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ChartContainer>
                </Card>
            </div>
        </div>
    );
};

export default TeacherStatistics;
