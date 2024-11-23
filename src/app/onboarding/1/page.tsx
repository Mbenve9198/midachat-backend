// src/app/onboarding/1/page.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowLeft, Download, PenTool, X } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface PlaceSuggestion {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  reviews_count?: number;
}

export default function RestaurantInfoStep() {
  const router = useRouter()
  const { toast } = useToast()
  const [step] = useState(1)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [selectedPlace, setSelectedPlace] = useState('')

  const handleImportClick = () => {
    setIsImportDialogOpen(true)
  }

  const handleManualClick = () => {
    // Per l'MVP reindirizziamo alla pagina di inserimento manuale
    router.push('/onboarding/1/manual')
  }

  const handleCloseDialog = () => {
    setIsImportDialogOpen(false)
    setRestaurantName('')
    setRestaurantAddress('')
    setSuggestions([])
    setSelectedPlace('')
  }

  const handleSearch = async () => {
    if (!restaurantName || !restaurantAddress) {
      toast({
        title: "Campi richiesti",
        description: "Inserisci sia il nome che l'indirizzo del ristorante",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/search-restaurant`, {
        name: restaurantName,
        address: restaurantAddress
      })

      if (response.data.length === 0) {
        toast({
          title: "Nessun risultato",
          description: "Non abbiamo trovato ristoranti corrispondenti. Prova a modificare la ricerca o inserisci i dati manualmente.",
          variant: "destructive"
        })
        return
      }

      setSuggestions(response.data)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la ricerca. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedPlace) {
      toast({
        title: "Selezione richiesta",
        description: "Seleziona un ristorante dalla lista",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/import-google`, {
        placeId: selectedPlace
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      toast({
        title: "Importazione completata",
        description: "I dati del tuo ristorante sono stati importati con successo!"
      })

      // Chiudi il dialog e vai al prossimo step
      handleCloseDialog()
      router.push('/onboarding/2')
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.2
      }
    }
  }

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 500,
        damping: 25
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-md w-full"
      >
        <div className="space-y-8">
          <motion.div variants={childVariants} className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.back()}
              className="text-foreground/60 hover:text-foreground"
            >
              <ArrowLeft size={20} />
            </Button>
            <span className="text-sm font-medium text-foreground/60">Step {step} of 5</span>
          </motion.div>

          <motion.div variants={childVariants} className="space-y-2 text-center">
            <h1 className="text-5xl font-bold text-foreground tracking-tight leading-tight">
              Dicci chi sei
            </h1>
            <p className="text-lg text-foreground/60">
              Scegli come vuoi inserire i dati del tuo ristorante (consigliamo l'importazione da Google)
            </p>
          </motion.div>

          <motion.div 
            variants={childVariants}
            className="flex justify-center"
          >
            <motion.img
              src="/chef-illustration.png"
              alt="Illustrazione di uno chef con una pentola fumante"
              className="w-64 h-64 object-contain"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
              onError={(e) => {
                console.error('Errore caricamento immagine:', e);
                e.currentTarget.style.border = '1px solid red';
              }}
            />
          </motion.div>

          <motion.div variants={childVariants} className="space-y-3">
            <Button 
              className="w-full py-4 text-base font-medium bg-black text-white hover:bg-black/90 flex items-center justify-center space-x-2 rounded-md transition-colors relative"
              onClick={handleImportClick}
              disabled={isLoading}
            >
              <Download size={18} />
              <span>Importa i dati da Google</span>
              <span className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl-md rounded-tr-md">
                Consigliato
              </span>
            </Button>
            <Button 
              variant="outline"
              className="w-full py-4 text-base font-medium border border-gray-200 hover:bg-gray-50 flex items-center justify-center space-x-2 rounded-md transition-colors"
              onClick={handleManualClick}
              disabled={isLoading}
            >
              <PenTool size={18} />
              <span>Aggiungi manualmente i dati</span>
            </Button>
          </motion.div>

          <motion.div
            variants={childVariants}
            className="text-center text-sm text-foreground/60"
          >
            <p>
              Hai bisogno di aiuto? <a href="#" className="underline hover:text-foreground">Contattaci</a>
            </p>
          </motion.div>
        </div>
      </motion.div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Importa dati da Google</DialogTitle>
            <DialogDescription>
              Inserisci il nome e l'indirizzo del tuo ristorante per cercare le informazioni su Google.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Indirizzo
              </Label>
              <Input
                id="address"
                value={restaurantAddress}
                onChange={(e) => setRestaurantAddress(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              className="ml-auto"
              disabled={isLoading}
            >
              {isLoading ? 'Ricerca...' : 'Cerca'}
            </Button>
            {suggestions.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="place" className="text-right">
                  Ristorante
                </Label>
                <Select 
                  onValueChange={setSelectedPlace} 
                  value={selectedPlace}
                  disabled={isLoading}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleziona il tuo ristorante" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestions.map((suggestion) => (
                      <SelectItem key={suggestion.place_id} value={suggestion.place_id}>
                        {suggestion.name} - {suggestion.address}
                        {suggestion.rating && ` (${suggestion.rating}⭐️ - ${suggestion.reviews_count} recensioni)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleCloseDialog}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedPlace || isLoading}
            >
              {isLoading ? 'Importazione...' : 'Importa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RestaurantInfoStep