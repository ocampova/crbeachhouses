/**
 * MemoryPanel
 *
 * Displays the Guru's selective memory — what it has chosen to remember
 * from past conversations. Users can view individual memory files and
 * delete specific ones or clear everything.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';
import {
  getAllMemoryFiles,
  deleteMemoryFile,
  clearAllMemory,
  getMemoryMeta,
  MemoryFile,
  MemoryMeta,
} from '../services/memoryService';
import { useFinancialStore } from '../store/useFinancialStore';

// Map file names to display labels and icons
const FILE_META: Record<string, { label: string; icon: string; color: string }> = {
  'perfil.md':           { label: 'Perfil del usuario',       icon: '👤', color: '#6366F1' },
  'ideas_clave.md':      { label: 'Ideas y decisiones clave', icon: '💡', color: '#F59E0B' },
  'metas.md':            { label: 'Metas financieras',         icon: '🎯', color: '#10B981' },
  'preocupaciones.md':   { label: 'Riesgos y preocupaciones', icon: '⚠️', color: '#EF4444' },
  'preferencias.md':     { label: 'Preferencias personales',  icon: '⚙️', color: '#8B5CF6' },
};

function getFileMeta(path: string) {
  const name = path.split('/').pop() ?? path;
  return FILE_META[name] ?? { label: name, icon: '📄', color: colors.textSecondary };
}

interface MemoryPanelProps {
  /** Called when a memory file is deleted so the parent can refresh */
  onMemoryChanged?: () => void;
}

export function MemoryPanel({ onMemoryChanged }: MemoryPanelProps) {
  const { memoryVersion } = useFinancialStore();

  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [meta, setMeta] = useState<MemoryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const loadMemory = useCallback(async () => {
    setLoading(true);
    const [f, m] = await Promise.all([getAllMemoryFiles(), getMemoryMeta()]);
    setFiles(f);
    setMeta(m);
    setLoading(false);
  }, []);

  // Reload every time the store bumps memoryVersion (consolidation ran)
  useEffect(() => {
    loadMemory();
  }, [memoryVersion, loadMemory]);

  // Pulse animation when loading (consolidation in progress)
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const handleViewFile = (file: MemoryFile) => {
    setSelectedFile(file);
    setModalVisible(true);
  };

  const handleDeleteFile = (file: MemoryFile) => {
    const meta = getFileMeta(file.path);
    Alert.alert(
      `Borrar recuerdo`,
      `¿Seguro que quieres que el Gurú olvide "${meta.label}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Olvidar',
          style: 'destructive',
          onPress: async () => {
            await deleteMemoryFile(file.path);
            await loadMemory();
            onMemoryChanged?.();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      '🧹 Borrar toda la memoria',
      'El Gurú olvidará TODAS las conversaciones anteriores y empezará desde cero. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            await clearAllMemory();
            setFiles([]);
            setMeta(null);
            onMemoryChanged?.();
          },
        },
      ]
    );
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca';
    return new Date(iso).toLocaleString('es', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🧠 Memoria del Gurú</Text>
          <Text style={styles.headerSubtitle}>Recuerdos selectivos de tus conversaciones</Text>
        </View>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Stats row */}
      {meta && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{files.length}</Text>
            <Text style={styles.statLabel}>archivos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{meta.totalConsolidations}</Text>
            <Text style={styles.statLabel}>consolidaciones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValueSmall}>{formatDate(meta.lastConsolidation)}</Text>
            <Text style={styles.statLabel}>última actualización</Text>
          </View>
        </View>
      )}

      {/* Memory files list */}
      {loading ? (
        <View style={styles.emptyState}>
          <Animated.Text style={[styles.emptyIcon, { opacity: pulseAnim }]}>🧠</Animated.Text>
          <Text style={styles.emptyText}>Cargando memoria...</Text>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            El Gurú todavía no tiene recuerdos guardados.{'\n'}
            Comienza una conversación y él irá guardando lo más importante.
          </Text>
          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>¿Cómo funciona?</Text>
            {[
              '💬 Charlas con el Gurú normalmente',
              '🤔 Él evalúa qué es realmente importante',
              '💾 Guarda solo las ideas clave automáticamente',
              '🔁 En la próxima sesión, lo recuerda todo',
            ].map((step) => (
              <Text key={step} style={styles.howStep}>{step}</Text>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {files.map((file) => {
            const fm = getFileMeta(file.path);
            const preview = file.content.split('\n').slice(1, 4).join(' ').trim();
            return (
              <TouchableOpacity
                key={file.path}
                style={styles.fileCard}
                onPress={() => handleViewFile(file)}
                activeOpacity={0.7}
              >
                <View style={[styles.fileIconBg, { backgroundColor: fm.color + '20' }]}>
                  <Text style={styles.fileIcon}>{fm.icon}</Text>
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileLabel}>{fm.label}</Text>
                  <Text style={styles.filePreview} numberOfLines={2}>
                    {preview || 'Sin contenido'}
                  </Text>
                  <Text style={styles.fileDate}>
                    Actualizado: {file.updatedAt?.substring(0, 10) ?? '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteFile(file)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {files.length > 0 && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
              <Text style={styles.clearAllText}>🗑️ Borrar toda la memoria</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* File detail modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFile && (() => {
              const fm = getFileMeta(selectedFile.path);
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalIcon}>{fm.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{fm.label}</Text>
                      <Text style={styles.modalDate}>
                        Actualizado: {selectedFile.updatedAt?.substring(0, 10)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.modalBody}>
                    <Text style={styles.modalBodyText}>{selectedFile.content}</Text>
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => handleDeleteFile(selectedFile), 300);
                    }}
                  >
                    <Text style={styles.modalDeleteText}>🗑️ Olvidar este recuerdo</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statValueSmall: { fontSize: 11, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  howItWorks: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  howStep: { fontSize: 13, color: colors.textSecondary },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  fileIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIcon: { fontSize: 22 },
  fileInfo: { flex: 1 },
  fileLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  filePreview: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  fileDate: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 13, color: colors.textMuted },
  clearAllBtn: {
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.danger + '50',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  clearAllText: { fontSize: 14, color: colors.danger, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalIcon: { fontSize: 28 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modalDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 6, marginLeft: 'auto' },
  closeBtnText: { fontSize: 18, color: colors.textMuted },
  modalBody: { maxHeight: 320, marginBottom: 12 },
  modalBodyText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  modalDeleteBtn: {
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.danger + '50',
    borderRadius: 12,
  },
  modalDeleteText: { fontSize: 14, color: colors.danger, fontWeight: '600' },
});
