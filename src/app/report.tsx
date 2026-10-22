import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { api, IncidentPayload } from '@/services/api';
import { getCurrentGPSLocation, LocationResult } from '@/services/location';

export default function ReportScreen() {
  const { user } = useAuth();

  const [loaiSuCo, setLoaiSuCo] = useState('Hỏa hoạn / Khói lạ');
  const [mucDo, setMucDo] = useState<'Cap bach' | 'Trung binh' | 'Thap'>('Cap bach');
  const [tieuDe, setTieuDe] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [moTaChiTiet, setMoTaChiTiet] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.7769,
    lng: 106.7009,
  });

  // State
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lấy GPS ban đầu
  useEffect(() => {
    handleAutoGPS();
  }, []);

  const handleAutoGPS = async () => {
    try {
      setGpsLoading(true);
      const loc = await getCurrentGPSLocation();
      setCoords({ lat: loc.latitude, lng: loc.longitude });
      setDiaChi(loc.address);
    } catch {
      // ignore
    } finally {
      setGpsLoading(false);
    }
  };

  // Chọn ảnh từ máy ảnh hoặc thư viện
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh trong cài đặt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setUploadingImage(true);
        try {
          const res = await api.upload.uploadImage(asset.uri, asset.fileName, asset.mimeType);
          setUploadedUrl(res.url);
        } catch (err: any) {
          Alert.alert('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên máy chủ.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  // Chụp ảnh trực tiếp bằng Camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền máy ảnh', 'Vui lòng cấp quyền sử dụng máy ảnh trong cài đặt.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setUploadingImage(true);
        try {
          const res = await api.upload.uploadImage(asset.uri, asset.fileName, asset.mimeType);
          setUploadedUrl(res.url);
        } catch (err: any) {
          Alert.alert('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên máy chủ.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const handleSubmit = async () => {
    if (!tieuDe.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề sự cố.');
      return;
    }

    if (uploadingImage) {
      Alert.alert('Đang tải ảnh', 'Ảnh đang được tải lên máy chủ, vui lòng đợi trong giây lát...');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      let finalImageUrl = uploadedUrl;
      // Nếu có ảnh đã chọn nhưng trước đó upload chưa xong, thử upload lại
      if (imageUri && !finalImageUrl) {
        try {
          const uploadRes = await api.upload.uploadImage(imageUri);
          finalImageUrl = uploadRes.url;
          setUploadedUrl(uploadRes.url);
        } catch {
          // Bỏ qua nếu không upload được để người dùng vẫn gửi được sự cố
        }
      }

      const payload: IncidentPayload = {
        userId: user?.id,
        loaiSuCo,
        mucDo,
        tieuDe: tieuDe.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        diaChi: diaChi || 'Khu vực TP. Hồ Chí Minh',
        moTaChiTiet: moTaChiTiet.trim(),
        imageUrl: finalImageUrl || undefined,
      };

      await api.incidents.create(payload);

      let msg = 'Báo cáo sự cố của bạn đã được gửi thành công!';
      if (mucDo === 'Cap bach') {
        msg = '⚡ Sự cố CẤP BÁCH đã được hệ thống tự động DUYỆT NGAY để phản ứng cứu trợ!';
      }

      setSuccessMsg(msg);
      Alert.alert('Thành công', msg);

      // Reset form
      setTieuDe('');
      setMoTaChiTiet('');
      setImageUri(null);
      setUploadedUrl(null);
    } catch (err: any) {
      Alert.alert('Gửi thất bại', err.message || 'Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setSubmitting(false);
    }
  };

  const incidentTypes = [
    'Hỏa hoạn / Khói lạ',
    'Ngập lụt / Triều cường',
    'Cây gãy đổ / Sạt lở',
    'Rò rỉ điện / Đứt cáp',
    'Tai nạn giao thông',
    'Khác',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Báo Cáo Sự Cố</Text>
          <Text style={styles.headerSubtitle}>
            Gửi cảnh báo và tọa độ GPS đến lực lượng an toàn cộng đồng
          </Text>
        </View>

        {successMsg && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* 1. Mức độ khẩn cấp */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>MỨC ĐỘ KHẨN CẤP</Text>
          <View style={styles.severityRow}>
            {[
              { id: 'Cap bach', label: 'Cấp bách', color: '#DC2626' },
              { id: 'Trung binh', label: 'Trung bình', color: '#D97706' },
              { id: 'Thap', label: 'Thấp', color: '#2563EB' },
            ].map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.severityBtn,
                  mucDo === s.id && { backgroundColor: s.color, borderColor: s.color },
                ]}
                onPress={() => setMucDo(s.id as any)}
              >
                <Text
                  style={[
                    styles.severityBtnText,
                    mucDo === s.id && { color: '#FFFFFF', fontWeight: '800' },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mucDo === 'Cap bach' && (
            <View style={styles.urgentAlertBox}>
              <Ionicons name="flash" size={14} color="#FBBF24" />
              <Text style={styles.urgentAlertText}>
                Ưu tiên đặc biệt: Sự cố cấp bách sẽ được hệ thống DUYỆT NGAY!
              </Text>
            </View>
          )}
        </View>

        {/* 2. Loại sự cố */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>LOẠI SỰ CỐ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {incidentTypes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, loaiSuCo === t && styles.typeChipActive]}
                onPress={() => setLoaiSuCo(t)}
              >
                <Text style={[styles.typeChipText, loaiSuCo === t && styles.typeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. Tiêu đề sự cố */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>TIÊU ĐỀ SỰ CỐ *</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Cháy bụi tre gần dây điện, khói đen..."
            placeholderTextColor="#64748B"
            value={tieuDe}
            onChangeText={setTieuDe}
          />
        </View>

        {/* 4. Vị trí GPS & Địa chỉ */}
        <View style={styles.fieldSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldLabel}>VỊ TRÍ GPS & ĐỊA CHỈ HIỆN TRƯỜNG</Text>
            <TouchableOpacity onPress={handleAutoGPS} disabled={gpsLoading}>
              <Text style={styles.gpsLinkText}>
                {gpsLoading ? 'Đang lấy GPS...' : '📍 Lấy lại GPS'}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { height: 60 }]}
            multiline
            numberOfLines={2}
            placeholder="Địa chỉ sự cố (tự động nhận từ GPS)"
            placeholderTextColor="#64748B"
            value={diaChi}
            onChangeText={setDiaChi}
          />
          <Text style={styles.coordsHint}>
            Tọa độ: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </Text>
        </View>

        {/* 5. Mô tả chi tiết */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>MÔ TẢ CHI TIẾT</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Mô tả số người bị kẹt, chướng ngại vật, lối vào cho xe cứu thương..."
            placeholderTextColor="#64748B"
            value={moTaChiTiet}
            onChangeText={setMoTaChiTiet}
          />
        </View>

        {/* 6. Đính kèm ảnh hiện trường */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>ẢNH HIỆN TRƯỜNG</Text>

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadingText}>Đang tải ảnh lên server...</Text>
                </View>
              )}
              {uploadedUrl && !uploadingImage && (
                <View style={styles.uploadSuccessBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={styles.uploadSuccessText}>Đã tải lên máy chủ</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => {
                  setImageUri(null);
                  setUploadedUrl(null);
                }}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActionsRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color="#F87171" />
                <Text style={styles.photoBtnText}>Chụp ảnh ngay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                <Ionicons name="images" size={20} color="#38BDF8" />
                <Text style={styles.photoBtnText}>Chọn từ máy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting || uploadingImage}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>GỬI BÁO CÁO SỰ CỐ</Text>
            </>
          )}
        </TouchableOpacity>
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
    marginBottom: 18,
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
  successBox: {
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
  successText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  severityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  urgentAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  urgentAlertText: {
    fontSize: 11,
    color: '#FCA5A5',
    fontWeight: '600',
    flex: 1,
  },
  typeScroll: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#161F33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top',
  },
  coordsHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#161F33',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  photoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  imagePreviewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
  },
  imagePreview: {
    width: '100%',
    height: 160,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadingText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  uploadSuccessBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  uploadSuccessText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
