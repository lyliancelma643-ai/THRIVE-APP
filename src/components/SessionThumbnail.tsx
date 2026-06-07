import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { typography } from '../theme/typography';
import { colors } from '../theme/colors';

export interface SessionData {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  progress?: string; // e.g., "4 / 13"
}

interface SessionThumbnailProps {
  session: SessionData;
  onPress: () => void;
}

export const SessionThumbnail: React.FC<SessionThumbnailProps> = ({
  session,
  onPress,
}) => {
  return (
    <Card style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: session.thumbnail }}
          style={styles.image}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{session.duration}</Text>
        </View>

        {session.isCompleted && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
          </View>
        )}

        {session.isLocked && (
          <View style={styles.statusBadge}>
            <View style={styles.lockBackground}>
              <Ionicons name="lock-closed" size={14} color="#A0A0A5" />
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={typography.body} numberOfLines={2}>
          {session.title}
        </Text>
        {session.progress && (
          <Text style={[typography.caption, styles.progressText]}>
            {session.progress}
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 200,
    marginRight: 16,
  },
  imageContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockBackground: {
    backgroundColor: 'rgba(28,28,30,0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  progressText: {
    marginTop: 4,
  },
});
