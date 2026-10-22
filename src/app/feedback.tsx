import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

export default function FeedbackScreen() {
  const { user } = useAuth();

  const [hovaten, setHovaten] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setHovaten(user.hovaten || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!hovaten.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung góp ý.');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      await api.feedback.create({
        hovaten: hovaten.trim(),
        email: email.trim(),
        content: content.trim(),
      });

      setSuccess(true);
      setContent('');
      Alert.alert(
        'Đã gửi thành công!',
        'Cảm ơn bạn đã đóng góp ý kiến. Phản hồi đã được chuyển đến ban điều hành an toàn.'
      );
    } catch (err: any) {
      Alert.alert('Gửi thất bại', err.message || 'Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đóng Góp Ý Kiến</Text>
          <Text style={styles.headerSubtitle}>
            Góp ý cải tiến hệ thống an toàn và tiếp nhận phản ánh dịch vụ
          </Text>
        </View>

        {success && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.successBannerText}>
              Phản hồi của bạn đã được ghi nhận vào cơ sở dữ liệu!
            </Text>
          </View>
        )}

        {/* Contact info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color="#FBBF24" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Email tiếp nhận ý kiến cộng đồng</Text>
              <Text style={styles.infoValue}>support@protectingyourlife.com</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>GỬI TIN NHẮN PHẢN HỒI</Text>

          {/* Họ và tên */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#64748B"
              value={hovaten}
              onChangeText={setHovaten}
            />
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Địa chỉ Email nhận phản hồi *</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Nội dung phản hồi */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nội dung phản hồi / Góp ý *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="Chia sẻ ý kiến, đề xuất hoặc phản ánh sự cố an toàn..."
              placeholderTextColor="#64748B"
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* Nút gửi */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>GỬI PHẢN HỒI NGAY</Text>
              </>
            )}
          </TouchableOpacity>
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#161F33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#161F33',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
