/**
 * Media Pipeline — FFmpeg-based video processing.
 * Timeline generation, audio sync, clip merging, subtitles.
 */
class MediaPipeline {
  constructor() {
    try {
      this.ffmpegPath = require('ffmpeg-static');
      this.ffmpeg = require('fluent-ffmpeg');
      if (this.ffmpegPath) this.ffmpeg.setFfmpegPath(this.ffmpegPath);
      this.available = true;
    } catch (e) {
      console.warn('FFmpeg not available:', e.message);
      this.available = false;
    }
  }

  isAvailable() { return this.available; }

  /**
   * Merge video clips into a single video
   */
  async mergeClips(clipPaths, outputPath) {
    if (!this.available) throw new Error('FFmpeg not available');
    return new Promise((resolve, reject) => {
      const cmd = this.ffmpeg();
      clipPaths.forEach(p => cmd.input(p));
      cmd.on('error', reject)
        .on('end', () => resolve(outputPath))
        .mergeToFile(outputPath, require('path').dirname(outputPath));
    });
  }

  /**
   * Add subtitles to video
   */
  async addSubtitles(videoPath, srtPath, outputPath) {
    if (!this.available) throw new Error('FFmpeg not available');
    return new Promise((resolve, reject) => {
      this.ffmpeg(videoPath)
        .videoFilters(`subtitles=${srtPath.replace(/\\/g, '/')}`)
        .output(outputPath)
        .on('error', reject)
        .on('end', () => resolve(outputPath))
        .run();
    });
  }

  /**
   * Mix audio tracks (voice + music)
   */
  async mixAudio(voicePath, musicPath, outputPath, musicVolume = 0.15) {
    if (!this.available) throw new Error('FFmpeg not available');
    return new Promise((resolve, reject) => {
      this.ffmpeg()
        .input(voicePath)
        .input(musicPath)
        .complexFilter([
          `[1:a]volume=${musicVolume}[music]`,
          `[0:a][music]amix=inputs=2:duration=first[out]`
        ])
        .outputOptions(['-map', '0:v?', '-map', '[out]'])
        .output(outputPath)
        .on('error', reject)
        .on('end', () => resolve(outputPath))
        .run();
    });
  }

  /**
   * Generate a preview thumbnail from video
   */
  async generateThumbnail(videoPath, outputPath, timestamp = '00:00:05') {
    if (!this.available) throw new Error('FFmpeg not available');
    return new Promise((resolve, reject) => {
      this.ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: require('path').basename(outputPath),
          folder: require('path').dirname(outputPath),
          size: '1280x720',
        })
        .on('error', reject)
        .on('end', () => resolve(outputPath));
    });
  }

  /**
   * Get video metadata
   */
  async getMetadata(filePath) {
    if (!this.available) return null;
    return new Promise((resolve, reject) => {
      this.ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve({
          duration: metadata.format?.duration,
          size: metadata.format?.size,
          bitrate: metadata.format?.bit_rate,
          streams: metadata.streams?.map(s => ({
            type: s.codec_type,
            codec: s.codec_name,
            width: s.width,
            height: s.height,
          })),
        });
      });
    });
  }
}

module.exports = MediaPipeline;
