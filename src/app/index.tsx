import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { api, resolveImageUrl, IncidentPayload } from '@/services/api';
import { getCurrentGPSLocation, LocationResult } from '@/services/location';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<IncidentPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<LocationResult | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const data = await api.incidents.getAll();
      setIncidents(data ? data.slice(0, 5) : []);
    } catch {
      // Backend may be offline or loading
    } finally {
      setLoading(false);
    }
  };

  const fetchGPS = async () => {
    try {
      setGpsLoading(true);
      const loc = await getCurrentGPSLocation();
      setGpsLocation(loc);
    } catch {
      // ignore
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchGPS();
  }, []);

  const handleCallEmergency = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              fetchIncidents();
              fetchGPS();
            }}
            tintColor="#EF4444"
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Protecting Your Life</Text>
              <Text style={styles.welcomeText}>
                {user ? `Xin chào, ${user.hovaten || user.email}` : 'Mạng lưới an toàn cộng đồng'}
              </Text>
            </View>
          </View>

          {!user ? (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/profile')}
            >
              {user.avatar ? (
                <Image
                  source={{ uri: resolveImageUrl(user.avatar) }}
                  style={styles.headerAvatarImg}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user.hovaten ? user.hovaten.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* SOS Emergency Hotline Buttons */}
        <View style={styles.sosSection}>
          <Text style={styles.sectionTitle}>GỌI KHẨN CẤP (1 CHẠM)</Text>
          <View style={styles.sosGrid}>
            {/* 114 PCCC */}
            <TouchableOpacity
              style={[styles.sosCard, { backgroundColor: '#DC2626' }]}
              onPress={() => handleCallEmergency('114')}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="fire-alt" size={26} color="#FFFFFF" />
              <Text style={styles.sosNumber}>114</Text>
              <Text style={styles.sosLabel}>Cứu hỏa PCCC</Text>
            </TouchableOpacity>

            {/* 115 Cấp cứu */}
            <TouchableOpacity
              style={[styles.sosCard, { backgroundColor: '#D97706' }]}
              onPress={() => handleCallEmergency('115')}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="ambulance" size={24} color="#FFFFFF" />
              <Text style={styles.sosNumber}>115</Text>
              <Text style={styles.sosLabel}>Cấp cứu Y tế</Text>
            </TouchableOpacity>

            {/* 113 Cảnh sát */}
            <TouchableOpacity
              style={[styles.sosCard, { backgroundColor: '#2563EB' }]}
              onPress={() => handleCallEmergency('113')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="local-police" size={26} color="#FFFFFF" />
              <Text style={styles.sosNumber}>113</Text>
              <Text style={styles.sosLabel}>Cảnh sát 113</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Button: Create Incident Report */}
        <TouchableOpacity
          style={styles.reportActionCard}
          onPress={() => router.push('/report')}
          activeOpacity={0.85}
        >
          <View style={styles.reportCardLeft}>
            <View style={styles.reportIconCircle}>
              <Ionicons name="warning" size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportCardTitle}>BÁO CÁO SỰ CỐ AN TOÀN</Text>
              <Text style={styles.reportCardSubtitle}>
                Chụp ảnh, gắn tọa độ GPS hiện trường gửi trung tâm cứu nạn
              </Text>
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={12} color="#FBBF24" />
                <Text style={styles.urgentBadgeText}>
                  Sự cố cấp bách sẽ được duyệt ngay lập tức!
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
        </TouchableOpacity>

        {/* GPS Location Card */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="navigate-circle" size={18} color="#38BDF8" />
              <Text style={styles.gpsTitle}>VỊ TRÍ GPS CỦA THIẾT BỊ BẠN</Text>
            </View>
            <TouchableOpacity onPress={fetchGPS} disabled={gpsLoading}>
              <Text style={styles.refreshGpsText}>
                {gpsLoading ? 'Đang dò...' : 'Dò lại GPS'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.gpsAddress} numberOfLines={2}>
            {gpsLocation?.address || 'Đang xác định tọa độ thiết bị qua vệ tinh...'}
          </Text>
          {gpsLocation?.latitude && (
            <Text style={styles.gpsCoords}>
              Tọa độ: {gpsLocation.latitude.toFixed(5)}, {gpsLocation.longitude.toFixed(5)}
              {gpsLocation.accuracy ? ` (Sai số ~${Math.round(gpsLocation.accuracy)}m)` : ''}
            </Text>
          )}
        </View>

        {/* Recent Incidents Section */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>SỰ CỐ KHẨN CẤP GẦN ĐÂY</Text>
            <TouchableOpacity onPress={fetchIncidents}>
              <Ionicons name="refresh" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {incidents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-checkmark-outline" size={36} color="#10B981" />
              <Text style={styles.emptyTitle}>Khu vực hiện an toàn</Text>
              <Text style={styles.emptySub}>
                Chưa có báo cáo sự cố nào được ghi nhận gần đây.
              </Text>
            </View>
          ) : (
            incidents.map((item) => (
              <View key={item.id} style={styles.incidentItem}>
                <View style={styles.incidentTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incidentType}>
                      #SC-{item.id} • {item.loaiSuCo}
                    </Text>
                    <Text style={styles.incidentTitle}>{item.tieuDe}</Text>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      item.mucDo === 'Cap bach'
                        ? styles.sevUrgent
                        : item.mucDo === 'Trung binh'
                        ? styles.sevMedium
                        : styles.sevLow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        item.mucDo === 'Cap bach'
                          ? { color: '#F87171' }
                          : item.mucDo === 'Trung binh'
                          ? { color: '#FBBF24' }
                          : { color: '#60A5FA' },
                      ]}
                    >
                      {item.mucDo === 'Cap bach'
                        ? 'CẤP BÁCH'
                        : item.mucDo === 'Trung binh'
                        ? 'TRUNG BÌNH'
                        : 'THẤP'}
                    </Text>
                  </View>
                </View>

                <View style={styles.incidentBottom}>
                  <Ionicons name="location-outline" size={13} color="#94A3B8" />
                  <Text style={styles.incidentAddress} numberOfLines={1}>
                    {item.diaChi}
                  </Text>
                </View>

                {item.imageUrl ? (
                  <View style={styles.incidentImgBox}>
                    <Image
                      source={{ uri: resolveImageUrl(item.imageUrl) }}
                      style={styles.incidentImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <View style={styles.statusRow}>
                  <Text style={styles.statusBadge}>
                    Trạng thái: {item.trangThai || 'Cho xu ly'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  welcomeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  loginBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sosSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sosCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  sosNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  sosLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  reportActionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  reportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 8,
  },
  reportIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reportCardSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },
  gpsCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 14,
    marginBottom: 20,
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  refreshGpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  gpsAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
    lineHeight: 17,
  },
  gpsCoords: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94A3B8',
    marginTop: 4,
  },
  recentSection: {
    marginBottom: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  incidentItem: {
    backgroundColor: '#161F33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 10,
  },
  incidentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  incidentType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  incidentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  sevUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  sevMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  sevLow: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  incidentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  incidentAddress: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
  incidentImgBox: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    height: 120,
    backgroundColor: '#0F172A',
  },
  incidentImg: {
    width: '100%',
    height: '100%',
  },
  statusRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#38BDF8',
  },
});
