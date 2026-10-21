import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import DCard from '@/components/ui/DCard';
import DButton from '@/components/ui/DButton';
import DText from '@/components/ui/DText';
import api from '@/lib/api';

type Plan = { name: string; monthlyPrice: number; lifetimePrice: number | null; maxBranches: number };
type Subscription = { packageId: string; packageName: string };

export default function PlanUpgradeHint() {
  const { colors } = useAppTheme();
  const [recommendation, setRecommendation] = useState<Plan | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/api/subscriptions/current').catch(() => ({ data: null })),
      api.get('/api/subscriptions/packages').catch(() => ({ data: [] })),
    ]).then(([subscriptionResult, packageResult]) => {
      if (!active) return;
      const subscription = subscriptionResult.data as Subscription | null;
      const plans = (Array.isArray(packageResult.data) ? packageResult.data : []) as (Plan & { id: string })[];
      const currentPlan = plans.find((plan) => plan.id === subscription?.packageId);
      const nextPlan = currentPlan
        ? plans.filter((plan) => plan.maxBranches > currentPlan.maxBranches).sort((a, b) => a.maxBranches - b.maxBranches)[0]
        : plans.sort((a, b) => a.maxBranches - b.maxBranches)[0];
      setRecommendation(nextPlan || null);
    });
    return () => { active = false; };
  }, []);

  if (!recommendation) return null;

  const showOptions = () => {
    const pricing = [`KES ${recommendation.monthlyPrice.toLocaleString()} monthly`];
    if (recommendation.lifetimePrice) pricing.push(`KES ${recommendation.lifetimePrice.toLocaleString()} one-time`);
    Alert.alert(
      `Upgrade to ${recommendation.name}`,
      `${recommendation.name} supports up to ${recommendation.maxBranches} stores. ${pricing.join(' or ')}. Contact the seller for an upgrade: 0729842998.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Call seller', onPress: () => { void Linking.openURL('tel:+254729842998'); } },
      ],
    );
  };

  return (
    <DCard style={{ marginTop: 8, borderColor: colors.primaryLight, backgroundColor: colors.primaryLight }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <MaterialCommunityIcons name="store-plus-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <DText variant="titleSm" weight="700" color={colors.primary}>Need more stores?</DText>
          <DText variant="bodySm" color={colors.primary} style={{ marginTop: 3 }}>
            {recommendation.name} adds more stores and tools, with up to {recommendation.maxBranches} locations.
          </DText>
          <DButton compact mode="text" onPress={showOptions} style={{ alignSelf: 'flex-start', marginTop: 3 }}>
            Contact seller
          </DButton>
        </View>
      </View>
    </DCard>
  );
}
