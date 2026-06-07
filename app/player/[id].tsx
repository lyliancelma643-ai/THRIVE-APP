import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X, Play, Pause, Maximize, RotateCcw } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);

  // Big Buck Bunny sample video
  const videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  // Toggle controls on press
  const handleToggleControls = () => {
    setShowControls(prev => !prev);
  };

  return (
    <View className="flex-1 bg-black">
      <Pressable className="flex-1" onPress={handleToggleControls}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          allowsFullscreen={false} // Custom controls
          allowsPictureInPicture={false}
          nativeControls={false}
        />

        {showControls && (
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent']}
              className="absolute top-0 left-0 right-0 h-32"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              className="absolute bottom-0 left-0 right-0 h-48"
            />

            {/* Top Bar */}
            <View 
              className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-6"
              style={{ paddingTop: insets.top || 20 }}
            >
              <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-white/20 rounded-full">
                <X color="#ffffff" size={24} />
              </Pressable>
              
              <View className="flex-row items-center bg-white/20 px-4 py-2 rounded-full">
                <RotateCcw color="#ffffff" size={16} />
                <Text className="text-white font-semibold ml-2 text-sm">Force Bas du Corps</Text>
              </View>
              
              <View className="w-10" />
            </View>

            {/* Middle Controls (Play/Pause) */}
            <View className="absolute inset-0 items-center justify-center pointer-events-box-none">
              <Pressable 
                className="w-20 h-20 items-center justify-center bg-black/40 rounded-full border border-white/20"
                onPress={() => {
                  if (player.playing) {
                    player.pause();
                  } else {
                    player.play();
                  }
                }}
              >
                {player.playing ? (
                  <Pause color="#ffffff" size={40} fill="#ffffff" />
                ) : (
                  <Play color="#ffffff" size={40} fill="#ffffff" className="ml-2" />
                )}
              </Pressable>
            </View>

            {/* Bottom Bar */}
            <View 
              className="absolute bottom-0 left-0 right-0 px-8"
              style={{ paddingBottom: insets.bottom || 24 }}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white font-display text-2xl font-bold mb-1">Squat Bulgare</Text>
                  <Text className="text-text-muted text-sm uppercase tracking-widest">Série 2/4</Text>
                </View>
                
                <View className="items-end">
                  <Text className="text-primary-accent font-display text-4xl font-bold mb-1">00:45</Text>
                  <Text className="text-text-muted text-sm uppercase tracking-widest">Temps restant</Text>
                </View>
              </View>
              
              {/* Progress Bar Mock */}
              <View className="w-full h-1 bg-white/30 rounded-full mt-6">
                <View className="h-full bg-primary-accent rounded-full w-1/3" />
              </View>
            </View>

          </View>
        )}
      </Pressable>
    </View>
  );
}
