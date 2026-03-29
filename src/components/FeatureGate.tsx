import { PLAN_FEATURES, Plan } from '@/lib/plans';

export const FeatureGate = ({ 
    tier, 
    children 
}: { 
    tier: Plan, 
    children: React.ReactNode 
}) => {
    // In production, we'd fetch the actual user plan from Supabase/Auth/Context here
    const userPlan: Plan = 'team'; // Mock current user state

    const hasAccess = (requiredTier: Plan) => {
        const hierarchy: Plan[] = ['solo', 'team', 'scale'];
        return hierarchy.indexOf(userPlan) >= hierarchy.indexOf(requiredTier);
    };

    if (!hasAccess(tier)) {
        return (
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-500">
                <p className="text-sm font-semibold mb-1">Upgrade to {tier.toUpperCase()} to access this</p>
                <button className="text-xs text-teal-600 font-bold hover:underline">Learn more →</button>
            </div>
        );
    }

    return <>{children}</>;
};
