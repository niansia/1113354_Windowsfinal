export type MedicalTrack = 'medicine' | 'health' | 'imaging' | 'engineering';
export type MedicalLevel = 'steady' | 'watch' | 'review' | 'urgent';

export interface MedicalCourse {
  id: string;
  title: string;
  track: MedicalTrack;
  level: 'foundation' | 'intermediate';
  summary: string;
  modules: string[];
  skills: string[];
  minutes: number;
  sourceIds: string[];
}

export interface MedicalSource {
  id: string;
  label: string;
  url: string;
  scope: string;
}

export interface VitalInput {
  temperatureC: number;
  systolic: number;
  diastolic: number;
  pulse: number;
  respiration: number;
  spo2: number;
}

export interface VitalFlag {
  id: keyof VitalInput;
  label: string;
  value: string;
  level: MedicalLevel;
  explanation: string;
  sourceId: string;
}

export interface VitalEvaluation {
  overallLevel: MedicalLevel;
  summary: string;
  flags: VitalFlag[];
}

export type ImagingModalityId = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'nuclear';

export interface ImagingModality {
  id: ImagingModalityId;
  title: string;
  bestFor: string[];
  notes: string[];
  prepQuestions: string[];
}

export interface ImagingProfile {
  pregnant: boolean;
  hasMetalImplant: boolean;
  kidneyDisease: boolean;
  contrastAllergy?: boolean;
}

export interface ImagingPrep {
  modality: ImagingModality;
  level: MedicalLevel;
  questions: string[];
  notes: string[];
}

