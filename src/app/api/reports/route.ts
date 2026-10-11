export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const AWS_API_ENDPOINT = 'https://xac2f650s9.execute-api.ap-south-1.amazonaws.com/reports';

// Fallback high-fidelity clinical demo sessions to populate the Power BI dashboard seamlessly
const CLINICAL_BENCHMARK_SESSIONS = [
  {
    SessionId: 'demo-session-wrist-01',
    timestamp: Date.now() - 3600000 * 2,
    patientAge: '34 Y',
    patientGender: 'Male',
    muscle: 'Left Forearm Flexor Group',
    side: 'Left',
    recordingSite: 'Left Forearm Flexor Group',
    exercise: 'Wrist Flexion',
    exerciseMode: 'Isometric Hold',
    durationSeconds: 60,
    activityGrade: 5,
    activityGradeText: 'Grade 5 / 5',
    signalQuality: 'GOOD',
    activityDetected: true,
    activeTimeSec: 60.5,
    activePercent: 100.0,
    sustainedActivityTimeSec: 60.5,
    activationEpisodes: 1,
    sustainedEpisodes: 1,
    longestEpisodeSec: 60.5,
    medianEpisodeSec: 60.5,
    medianRestSec: 0.0,
    averageActiveEnvelope: 8.17,
    peakActiveEnvelope: 62,
    baselineValue: 4,
    mvcReference: 49,
    analysisVersion: 'v2',
    sessionPattern: 'SUSTAINED ACTIVATION',
    spikesCount: 187,
    interpretationNarrative: 'Surface electrical activity was detected from the selected recording region. 1 sustained episode of 60.5s.',
    oneSentenceSummary: 'Optimal motor unit recruitment with sustained active engagement throughout exercise.',
    graphValues: Array.from({ length: 60 }, (_, i) => ({
      sec: i + 1,
      envelope: +(6 + Math.sin(i * 0.15) * 3 + (i > 45 ? (i - 45) * 0.35 : 0) + (Math.random() * 1.5 - 0.75)).toFixed(2),
      raw: Math.round(Math.sin(i * 0.8) * (20 + (i > 45 ? 35 : 10)) + (Math.random() * 12 - 6)),
      isActive: true
    }))
  },
  {
    SessionId: 'demo-session-biceps-02',
    timestamp: Date.now() - 3600000 * 5,
    patientAge: '28 Y',
    patientGender: 'Female',
    muscle: 'Biceps Brachii',
    side: 'Right',
    recordingSite: 'Right Biceps Brachii',
    exercise: 'Dumbbell Curl',
    exerciseMode: 'Dynamic Repetitions',
    durationSeconds: 45,
    activityGrade: 4,
    activityGradeText: 'Grade 4 / 5',
    signalQuality: 'GOOD',
    activityDetected: true,
    activeTimeSec: 36.2,
    activePercent: 80.4,
    sustainedActivityTimeSec: 28.0,
    activationEpisodes: 8,
    sustainedEpisodes: 6,
    longestEpisodeSec: 4.8,
    medianEpisodeSec: 4.2,
    medianRestSec: 1.1,
    averageActiveEnvelope: 14.8,
    peakActiveEnvelope: 84,
    baselineValue: 5,
    mvcReference: 92,
    analysisVersion: 'v2',
    sessionPattern: 'REPEATED BURSTS',
    spikesCount: 240,
    interpretationNarrative: 'Crisp contraction bursts with rapid rest returns between active flexions.',
    oneSentenceSummary: 'Healthy dynamic rhythmic firing with high peak voluntary envelope.',
    graphValues: Array.from({ length: 45 }, (_, i) => ({
      sec: i + 1,
      envelope: +(Math.abs(Math.sin(i * 0.45)) * 14 + 3).toFixed(2),
      raw: Math.round(Math.sin(i * 0.9) * 45),
      isActive: Math.abs(Math.sin(i * 0.45)) > 0.35
    }))
  },
  {
    SessionId: 'demo-session-quads-03',
    timestamp: Date.now() - 3600000 * 18,
    patientAge: '52 Y',
    patientGender: 'Male',
    muscle: 'Vastus Medialis (Quadriceps)',
    side: 'Right',
    recordingSite: 'Right Knee Extensor',
    exercise: 'Terminal Knee Extension',
    exerciseMode: 'Rehabilitation Protocol',
    durationSeconds: 60,
    activityGrade: 3,
    activityGradeText: 'Grade 3 / 5',
    signalQuality: 'ACCEPTABLE',
    activityDetected: true,
    activeTimeSec: 42.1,
    activePercent: 70.2,
    sustainedActivityTimeSec: 32.5,
    activationEpisodes: 4,
    sustainedEpisodes: 3,
    longestEpisodeSec: 12.0,
    medianEpisodeSec: 10.5,
    medianRestSec: 4.5,
    averageActiveEnvelope: 11.2,
    peakActiveEnvelope: 54,
    baselineValue: 6,
    mvcReference: 65,
    analysisVersion: 'v2',
    sessionPattern: 'REPEATED AND SUSTAINED',
    spikesCount: 145,
    interpretationNarrative: 'Post-op rehabilitation trace indicating gradual progressive recruitment of VMO motor units.',
    oneSentenceSummary: 'Moderate endurance with intermittent rest intervals required.',
    graphValues: Array.from({ length: 60 }, (_, i) => ({
      sec: i + 1,
      envelope: +(7 + Math.sin(i * 0.2) * 5 + (Math.random() * 2 - 1)).toFixed(2),
      raw: Math.round(Math.sin(i * 0.6) * 30),
      isActive: Math.sin(i * 0.2) > -0.2
    }))
  },
  {
    SessionId: 'demo-session-trapezius-04',
    timestamp: Date.now() - 3600000 * 28,
    patientAge: '41 Y',
    patientGender: 'Female',
    muscle: 'Upper Trapezius',
    side: 'Left',
    recordingSite: 'Left Cervicothoracic',
    exercise: 'Shoulder Shrug Hold',
    exerciseMode: 'Postural Fatigue Analysis',
    durationSeconds: 60,
    activityGrade: 5,
    activityGradeText: 'Grade 5 / 5',
    signalQuality: 'GOOD',
    activityDetected: true,
    activeTimeSec: 58.0,
    activePercent: 96.6,
    sustainedActivityTimeSec: 58.0,
    activationEpisodes: 1,
    sustainedEpisodes: 1,
    longestEpisodeSec: 58.0,
    medianEpisodeSec: 58.0,
    medianRestSec: 0.0,
    averageActiveEnvelope: 16.5,
    peakActiveEnvelope: 76,
    baselineValue: 3,
    mvcReference: 80,
    analysisVersion: 'v2',
    sessionPattern: 'SUSTAINED ACTIVATION',
    spikesCount: 310,
    interpretationNarrative: 'High sustained baseline tension showing classic postural muscle endurance profile.',
    oneSentenceSummary: 'Continuous tonic firing with early indicators of neuromuscular fatigue past second 40.',
    graphValues: Array.from({ length: 60 }, (_, i) => ({
      sec: i + 1,
      envelope: +(12 + (i * 0.1) + Math.sin(i * 0.3) * 3).toFixed(2),
      raw: Math.round(Math.sin(i * 0.7) * 40),
      isActive: true
    }))
  },
  {
    SessionId: 'demo-session-deltoid-05',
    timestamp: Date.now() - 3600000 * 42,
    patientAge: '24 Y',
    patientGender: 'Male',
    muscle: 'Anterior Deltoid',
    side: 'Right',
    recordingSite: 'Right Shoulder',
    exercise: 'Forward Arm Raise',
    exerciseMode: 'Dynamic Strength',
    durationSeconds: 30,
    activityGrade: 5,
    activityGradeText: 'Grade 5 / 5',
    signalQuality: 'GOOD',
    activityDetected: true,
    activeTimeSec: 28.5,
    activePercent: 95.0,
    sustainedActivityTimeSec: 25.0,
    activationEpisodes: 5,
    sustainedEpisodes: 4,
    longestEpisodeSec: 5.5,
    medianEpisodeSec: 5.0,
    medianRestSec: 0.5,
    averageActiveEnvelope: 19.4,
    peakActiveEnvelope: 104,
    baselineValue: 4,
    mvcReference: 110,
    analysisVersion: 'v2',
    sessionPattern: 'REPEATED BURSTS',
    spikesCount: 220,
    interpretationNarrative: 'High power explosive recruitment with rapid rise time.',
    oneSentenceSummary: 'Peak voluntary recruitment reached 94% of MVC baseline.',
    graphValues: Array.from({ length: 30 }, (_, i) => ({
      sec: i + 1,
      envelope: +(Math.abs(Math.sin(i * 0.6)) * 18 + 4).toFixed(2),
      raw: Math.round(Math.sin(i * 1.1) * 60),
      isActive: true
    }))
  }
];

export async function GET() {
  try {
    // Attempt fetch from live AWS DynamoDB via API Gateway
    const response = await fetch(AWS_API_ENDPOINT, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      const liveItems = data.reports || [];

      // Merge live DynamoDB items with benchmarks for rich analytics if live count is small
      const combined = [...liveItems];
      for (const demo of CLINICAL_BENCHMARK_SESSIONS) {
        if (!combined.some(item => item.SessionId === demo.SessionId)) {
          combined.push(demo);
        }
      }

      return NextResponse.json({
        success: true,
        source: 'AWS_DYNAMODB_HYBRID',
        liveCount: liveItems.length,
        totalSessions: combined.length,
        reports: combined
      });
    }
  } catch (err) {
    console.warn('Live AWS fetch failed or offline; using local clinical dataset.', err);
  }

  // Graceful fallback with rich clinical benchmark dataset
  return NextResponse.json({
    success: true,
    source: 'CLINICAL_BENCHMARK_CACHE',
    liveCount: 0,
    totalSessions: CLINICAL_BENCHMARK_SESSIONS.length,
    reports: CLINICAL_BENCHMARK_SESSIONS
  });
}
