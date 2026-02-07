'use client';

import { useEffect, useState } from 'react';
import {
  parseCSV,
  getPortfolioStats,
  groupOptions,
  type Holding,
  type PortfolioStats,
  type OptionGroup
} from '@/lib/data-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Search, PieChart, Layers, List } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<Holding[]>([]);
  const [filteredData, setFilteredData] = useState<Holding[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEtf, setSelectedEtf] = useState<string>('ALL');
  const [uniqueEtfs, setUniqueEtfs] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const rawData = await parseCSV('/normalized_holdings.csv');
        setData(rawData);
        setUniqueEtfs(Array.from(new Set(rawData.map(h => h['ETF Ticker']))).sort());

        // Initial stats
        setStats(getPortfolioStats(rawData));
        setOptionGroups(groupOptions(rawData));
        setLoading(false);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(err instanceof Error ? err.message : 'Unknown error loading data');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let result = data;

    if (selectedEtf !== 'ALL') {
      result = result.filter(h => h['ETF Ticker'] === selectedEtf);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(h =>
        h.Name?.toLowerCase().includes(lowerQuery) ||
        h.Ticker?.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredData(result);
    // Re-calc stats based on filter? Or keep global?
    // Usually KPI cards reflect current view
    setStats(getPortfolioStats(result));
    setOptionGroups(groupOptions(result));

  }, [data, selectedEtf, searchQuery]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading Dashboard...</div>;
  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-destructive gap-4">
      <h2 className="text-2xl font-bold">Error Loading Dashboard</h2>
      <p className="text-muted-foreground">{error}</p>
      <p className="text-sm">Check if /public/normalized_holdings.csv exists.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6 font-sans">
      {/* Header / Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 backdrop-blur-md p-4 rounded-xl border border-border/50 sticky top-0 z-50 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            ETF Holdings Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats?.holdingCount} Holdings Analyzed
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Select value={selectedEtf} onValueChange={setSelectedEtf}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by ETF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All ETFs</SelectItem>
              {uniqueEtfs.map(etf => (
                <SelectItem key={etf} value={etf}>{etf}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search holdings..."
              className="pl-9 w-full sm:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total AUM" value={`$${(stats?.totalAum || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<PieChart className="h-4 w-4" />} />
        <KPICard title="Total Holdings" value={stats?.holdingCount.toString() || '0'} icon={<List className="h-4 w-4" />} />
        <KPICard title="Top ETF (Weight)" value={stats?.topEtf.ticker || 'N/A'} subValue={`$${(stats?.topEtf.weight || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<Layers className="h-4 w-4" />} />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="options">Option Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Main Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>ETF</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 100).map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{row.Date}</TableCell>
                        <TableCell><Badge variant="outline">{row['ETF Ticker']}</Badge></TableCell>
                        <TableCell className="font-medium">{row.Ticker}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row.Name}>{row.Name}</TableCell>
                        <TableCell className={`text-right font-mono ${row['Share Quantity'] < 0 ? 'text-destructive' : ''}`}>
                          {row['Share Quantity']?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row['Market Value'] ? `$${row['Market Value'].toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.Weight ? `${row.Weight}%` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredData.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Showing first 100 of {filteredData.length} rows...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {optionGroups.map((group) => (
              <OptionCard key={group.underlying} group={group} />
            ))}
            {optionGroups.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No options found in current filtered view.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, subValue, icon }: { title: string; value: string; subValue?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

function OptionCard({ group }: { group: OptionGroup }) {
  const isBearish = group.sentiment === 'Bearish';
  const isBullish = group.sentiment === 'Bullish';

  return (
    <Card className="overflow-hidden border-border/10 bg-card/50 hover:border-primary/50 transition-all duration-300 shadow-lg group">
      <CardHeader className="bg-muted/10 pb-4 pt-5 px-5 border-b border-border/5">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground/90">
              {group.underlying} <span className="text-muted-foreground font-normal text-sm ml-1">PUT/CALL RATIO</span>
            </CardTitle>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-foreground tracking-tighter">
                {group.putCallRatio.toFixed(2)}
              </span>
              <div className={`flex items-center gap-1 text-sm font-medium ${isBearish ? 'text-destructive' : isBullish ? 'text-green-500' : 'text-muted-foreground'}`}>
                {isBearish ? <ArrowDownRight className="h-4 w-4" /> : isBullish ? <ArrowUpRight className="h-4 w-4" /> : null}
                {group.sentiment}
              </div>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <PieChart className="h-5 w-5" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2 font-mono">
          Total Contracts: {group.totalContracts.toLocaleString()}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-5 py-2 bg-muted/5 text-[10px] items-center flex justify-between uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/5">
          <span>Contract</span>
          <span>Holders</span>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="divide-y divide-border/5">
            {group.options.map((opt, i) => (
              <div key={i} className="px-5 py-3 flex justify-between items-center hover:bg-muted/5 transition-colors group/item">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${opt.details.type === 'Call' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                      {opt.details.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm font-medium text-foreground/90">{opt.details.strike}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Exp: {opt.details.expiry}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-1 max-w-[50%]">
                  {opt.heldBy.map(etf => (
                    <Badge key={etf} variant="secondary" className="text-[10px] px-1.5 h-5 bg-secondary/50 hover:bg-secondary text-secondary-foreground/80 border-0">
                      {etf}
                    </Badge>
                  ))}
                  <div className="w-full text-right text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                    Qty: {Math.abs(opt.quantity).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
