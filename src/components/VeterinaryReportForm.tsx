import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Mic, 
  Square, 
  Heart, 
  Stethoscope, 
  FileText, 
  User, 
  MapPin,
  Clock,
  Search,
  Link
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface VeterinaryReportFormProps {}

const VeterinaryReportForm: React.FC<VeterinaryReportFormProps> = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedVeterinarian, setSelectedVeterinarian] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [audioData, setAudioData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [petData, setPetData] = useState({
    name: '',
    tutorName: '',
    species: '',
    sex: '',
    status: '',
    microchip: '',
    hasMicrochip: false,
    referenceClinic: '',
    additionalInfo: ''
  });

  const reportTypes = [
    { value: 'anamnesis', label: 'Anamnesis', icon: FileText },
    { value: 'ecocardio', label: 'Informe ecocardio', icon: Heart },
    { value: 'cardiaco', label: 'Informe cardíaco', icon: Heart },
    { value: 'ecografia-general', label: 'Informe ecografía general', icon: Stethoscope },
    { value: 'consulta', label: 'Informe consulta', icon: FileText },
    { value: 'ecografia-abdomen', label: 'Ecografía abdomen', icon: Stethoscope }
  ];

  const veterinariansList = [
    { id: '001', name: 'Antonio' },
    { id: '002', name: 'Miguel' },
    { id: '003', name: 'Dra. Ana López' }
  ];

  const speciesList = ['Perro', 'Gato', 'Conejo', 'Otro'];
  const sexList = ['Macho', 'Hembra'];
  const statusList = ['Entero', 'Castrado'];

  // Efecto de limpieza para el temporizador
  useEffect(() => {
    return () => {
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
    };
  }, [recordingTimer]);

  const toggleRecording = async () => {
    if (!isRecording) {
      // Iniciar grabación
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });

        // Intentar usar MP4 primero, si no funciona usar WebM
        let mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/webm;codecs=opus';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: mimeType
        });

        const audioChunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          const reader = new FileReader();
          
          reader.onloadend = () => {
            let base64String = reader.result as string;
            
            // Si grabamos en WebM pero queremos etiquetar como MP4 para compatibilidad
            if (mimeType.includes('webm')) {
              // Cambiar el prefijo para que parezca MP4
              base64String = base64String.replace('data:audio/webm', 'data:audio/mp4');
            }
            
            setAudioData(base64String);
            
            toast({
              title: "Audio Guardado",
              description: `Grabación completada (${formatTime(recordingTime)})`,
            });
          };
          
          reader.readAsDataURL(audioBlob);
          
          // Detener todos los tracks del stream
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingTime(0);

        // Iniciar el temporizador
        const timer = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setRecordingTimer(timer);

      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: "Error",
          description: "No se pudo acceder al micrófono. Verifique los permisos.",
          variant: "destructive",
        });
      }
    } else {
      // Detener grabación
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateReport = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Por favor ingrese la URL del webhook de n8n",
        variant: "destructive",
      });
      return;
    }

    if (!petData.name || !petData.tutorName || !selectedReport || !petData.species || !petData.sex || !petData.status) {
      toast({
        title: "Error",
        description: "Por favor complete los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const selectedVet = veterinariansList.find(vet => vet.id === selectedVeterinarian);
      
      // Crear FormData para enviar como parámetros individuales planos
      const formData = new FormData();
      formData.append('createdAt', new Date().toISOString());
      formData.append('loggedIn', 'true');
      formData.append('user', 'Testing');
      formData.append('clientName', petData.name);
      formData.append('tutorName', petData.tutorName);
      formData.append('selectedReport', reportTypes.find(report => report.value === selectedReport)?.label || selectedReport);
      formData.append('species', petData.species);
      formData.append('sex', petData.sex);
      formData.append('sterilization', petData.status);
      formData.append('referralClinic', petData.referenceClinic || "");
      formData.append('hasMicrochip', petData.hasMicrochip.toString());
      formData.append('microchipNumber', petData.hasMicrochip ? petData.microchip : "");
      formData.append('infoAdicional', petData.additionalInfo || "");
      formData.append('audioData', audioData || "");
      formData.append('reportFileID', "");
      formData.append('selectedVet', selectedVet ? `${selectedVet.name.replace(/^Dr\.|^Dra\./, '').trim()}` : 'null');
      formData.append('selectedClinic', '');
      formData.append('address', 'C/ lafuente, 32');
      formData.append('vetList', '');
      formData.append('0', '');
      formData.append('name', 'Antonio');
      formData.append('number', '001');
      formData.append('1', '');
      formData.append('name', 'Miguel');
      formData.append('number', '002');
      formData.append('clinicList', '');
      formData.append('0', '');
      formData.append('address', 'C/ lafuente, 32');

      const response = await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });

      toast({
        title: "Informe Enviado",
        description: "El informe ha sido enviado correctamente al sistema de procesamiento.",
      });

    } catch (error) {
      console.error("Error enviando el informe:", error);
      toast({
        title: "Error",
        description: "Error al enviar el informe. Por favor verifique la URL del webhook.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-lg border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Heart className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-bold text-2xl tracking-tight">Sistema de Informes</h1>
                <p className="text-primary-foreground/80 text-sm">Gestión Veterinaria</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-primary-foreground/80">Seleccionar veterinario</p>
                <p className="font-medium">Nuevo informe</p>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">C/ lafuente, 32</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg border-0 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Información del Informe</h2>
                    <p className="text-sm text-muted-foreground">Complete los datos del paciente</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                
                {/* Report Type Selection */}
                <div className="space-y-3">
                  <Label htmlFor="report-type" className="text-base font-semibold text-foreground">
                    Tipo de Informe *
                  </Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="w-full h-12 bg-background border-2 border-border hover:border-primary transition-colors rounded-xl">
                      <SelectValue placeholder="Seleccionar tipo de informe" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border shadow-xl z-50 rounded-xl">
                      {reportTypes.map((report) => (
                        <SelectItem key={report.value} value={report.value} className="rounded-lg">
                          <div className="flex items-center space-x-3 py-1">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                              <report.icon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{report.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pet Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="pet-name" className="text-base font-semibold text-foreground">
                      Nombre de mascota *
                    </Label>
                    <Input
                      id="pet-name"
                      placeholder="Ej: Bobby, Luna..."
                      value={petData.name}
                      onChange={(e) => setPetData({...petData, name: e.target.value})}
                      className="h-12 bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="tutor-name" className="text-base font-semibold text-foreground">
                      Nombre del Tutor *
                    </Label>
                    <Input
                      id="tutor-name"
                      placeholder="Nombre completo del propietario"
                      value={petData.tutorName}
                      onChange={(e) => setPetData({...petData, tutorName: e.target.value})}
                      className="h-12 bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl"
                    />
                  </div>
                </div>

                {/* Species, Sex, Status */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Especie *</Label>
                    <Select value={petData.species} onValueChange={(value) => setPetData({...petData, species: value})}>
                      <SelectTrigger className="h-12 bg-background border-2 border-border hover:border-primary transition-colors rounded-xl">
                        <SelectValue placeholder="Seleccionar especie" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-xl z-50 rounded-xl">
                        {speciesList.map((species) => (
                          <SelectItem key={species} value={species.toLowerCase()} className="rounded-lg">
                            <span className="font-medium">{species}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Sexo *</Label>
                    <Select value={petData.sex} onValueChange={(value) => setPetData({...petData, sex: value})}>
                      <SelectTrigger className="h-12 bg-background border-2 border-border hover:border-primary transition-colors rounded-xl">
                        <SelectValue placeholder="Seleccionar sexo" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-xl z-50 rounded-xl">
                        {sexList.map((sex) => (
                          <SelectItem key={sex} value={sex.toLowerCase()} className="rounded-lg">
                            <span className="font-medium">{sex}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Estado *</Label>
                    <Select value={petData.status} onValueChange={(value) => setPetData({...petData, status: value})}>
                      <SelectTrigger className="h-12 bg-background border-2 border-border hover:border-primary transition-colors rounded-xl">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-xl z-50 rounded-xl">
                        {statusList.map((status) => (
                          <SelectItem key={status} value={status.toLowerCase()} className="rounded-lg">
                            <span className="font-medium">{status}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Microchip */}
                <div className="space-y-4 p-6 bg-muted/30 rounded-xl border border-border/50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="has-microchip"
                      checked={petData.hasMicrochip}
                      onCheckedChange={(checked) => 
                        setPetData({...petData, hasMicrochip: checked as boolean})
                      }
                      className="h-5 w-5"
                    />
                    <Label htmlFor="has-microchip" className="text-base font-semibold text-foreground cursor-pointer">
                      Tiene Microchip
                    </Label>
                  </div>
                  
                  {petData.hasMicrochip && (
                    <Input
                      placeholder="Número de microchip (15 dígitos)"
                      value={petData.microchip}
                      onChange={(e) => setPetData({...petData, microchip: e.target.value})}
                      className="h-12 bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl"
                    />
                  )}
                </div>

                {/* Reference Clinic */}
                <div className="space-y-3">
                  <Label htmlFor="reference-clinic" className="text-base font-semibold text-foreground">
                    Clínica de referencia
                  </Label>
                  <Input
                    id="reference-clinic"
                    placeholder="Nombre de la clínica de origen (opcional)"
                    value={petData.referenceClinic}
                    onChange={(e) => setPetData({...petData, referenceClinic: e.target.value})}
                    className="h-12 bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl"
                  />
                </div>

                {/* Additional Information */}
                <div className="space-y-3">
                  <Label htmlFor="additional-info" className="text-base font-semibold text-foreground">
                    Información adicional
                  </Label>
                  <Textarea
                    id="additional-info"
                    placeholder="Observaciones, comentarios adicionales, historial relevante..."
                    value={petData.additionalInfo}
                    onChange={(e) => setPetData({...petData, additionalInfo: e.target.value})}
                    className="min-h-[140px] bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl resize-y"
                  />
                </div>

                {/* Webhook URL */}
                <div className="space-y-3 p-6 bg-muted/20 rounded-xl border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Link className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url" className="text-base font-semibold text-foreground">
                        URL del Webhook n8n *
                      </Label>
                      <p className="text-sm text-muted-foreground">URL del webhook para procesar el informe</p>
                    </div>
                  </div>
                  <Input
                    id="webhook-url"
                    placeholder="https://automatizacion.aigencia.ai/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="h-12 bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Voice Recording Section */}
            <Card className="shadow-lg border-0 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 border-b border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Mic className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Grabación de Audio</h2>
                    <p className="text-sm text-muted-foreground">Grabe notas adicionales por voz</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <span className="text-4xl font-mono font-bold text-foreground">
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    {isRecording && (
                      <Badge variant="destructive" className="animate-pulse px-3 py-1 text-sm">
                        ● Grabando
                      </Badge>
                    )}
                    {audioData && !isRecording && (
                      <Badge variant="default" className="px-3 py-1 text-sm">
                        ✓ Audio guardado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {audioData && !isRecording && (
                      <Button
                        onClick={() => {
                          setAudioData('');
                          setRecordingTime(0);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-lg"
                      >
                        Borrar Audio
                      </Button>
                    )}
                    
                    <Button
                      onClick={toggleRecording}
                      disabled={isLoading}
                      variant={isRecording ? "destructive" : "default"}
                      size="lg"
                      className="rounded-full w-20 h-20 shadow-xl hover:scale-110 transition-all duration-200 border-4 border-background"
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            
            {/* Veterinarian Selection */}
            <Card className="shadow-lg border-0 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-success/5 to-success/10 border-b border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Stethoscope className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Seleccionar Veterinario</h3>
                    <p className="text-sm text-muted-foreground">Busque y seleccione el veterinario</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    className="pl-12 h-12 bg-background border-2 border-border hover:border-primary focus:border-primary transition-colors rounded-xl"
                  />
                </div>
                
                <div className="space-y-3">
                  {veterinariansList.map((veterinarian) => (
                    <div
                      key={veterinarian.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                        selectedVeterinarian === veterinarian.id 
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
                          : 'bg-background hover:bg-muted/50 border-border hover:border-primary/50 shadow-sm'
                      }`}
                      onClick={() => setSelectedVeterinarian(veterinarian.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{veterinarian.name}</span>
                        <Badge 
                          variant={selectedVeterinarian === veterinarian.id ? "secondary" : "outline"} 
                          className="text-sm px-2 py-1"
                        >
                          #{veterinarian.id}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button 
                onClick={generateReport}
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-5 w-5" />
                    Generar Informe
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-12 border-2 border-border hover:border-primary bg-background hover:bg-muted/50 transition-all duration-200 rounded-xl text-base font-medium"
              >
                <Heart className="mr-2 h-4 w-4" />
                Guardar Borrador
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full h-12 hover:bg-muted/50 transition-all duration-200 rounded-xl text-base font-medium"
              >
                <Square className="mr-2 h-4 w-4" />
                Limpiar Formulario
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default VeterinaryReportForm;