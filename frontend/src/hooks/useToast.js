/**
 * useToast — Reusable toast notification hook.
 * Eliminates duplicated toast state/logic across pages.
 *
 * Usage:
 *   const { toast, showToast } = useToast()
 *   showToast('Record saved!', 'success')
 */
import { useState, useCallback, useRef } from 'react'

export default function useToast(duration = 3000) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type })
    timerRef.current = setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, duration)
  }, [duration])

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return { toast, showToast, dismissToast }
}















// /**
//  * useToast — Reusable toast notification hook.
//  * Eliminates duplicated toast state/logic across pages.
//  *
//  * Usage:
//  *   const { toast, showToast } = useToast()
//  *   showToast('Record saved!', 'success')
//  */
// import { useState, useCallback, useRef } from 'react'

// export default function useToast(duration = 3000) {
//   const [toast, setToast] = useState(null)
//   const timerRef = useRef(null)

//   const showToast = useCallback((message, type = 'success') => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast({ message, type })
//     timerRef.current = setTimeout(() => {
//       setToast(null)
//       timerRef.current = null
//     }, duration)
//   }, [duration])

//   const dismissToast = useCallback(() => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast(null)
//   }, [])

//   return { toast, showToast, dismissToast }
// }








// /**
//  * useToast — Reusable toast notification hook.
//  * Eliminates duplicated toast state/logic across pages.
//  *
//  * Usage:
//  *   const { toast, showToast } = useToast()
//  *   showToast('Record saved!', 'success')
//  */
// import { useState, useCallback, useRef } from 'react'

// export default function useToast(duration = 3000) {
//   const [toast, setToast] = useState(null)
//   const timerRef = useRef(null)

//   const showToast = useCallback((message, type = 'success') => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast({ message, type })
//     timerRef.current = setTimeout(() => {
//       setToast(null)
//       timerRef.current = null
//     }, duration)
//   }, [duration])

//   const dismissToast = useCallback(() => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast(null)
//   }, [])

//   return { toast, showToast, dismissToast }
// }













// /**
//  * useToast — Reusable toast notification hook.
//  * Eliminates duplicated toast state/logic across pages.
//  *
//  * Usage:
//  *   const { toast, showToast } = useToast()
//  *   showToast('Record saved!', 'success')
//  */
// import { useState, useCallback, useRef } from 'react'

// export default function useToast(duration = 3000) {
//   const [toast, setToast] = useState(null)
//   const timerRef = useRef(null)

//   const showToast = useCallback((message, type = 'success') => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast({ message, type })
//     timerRef.current = setTimeout(() => {
//       setToast(null)
//       timerRef.current = null
//     }, duration)
//   }, [duration])

//   const dismissToast = useCallback(() => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast(null)
//   }, [])

//   return { toast, showToast, dismissToast }
// }








// /**
//  * useToast — Reusable toast notification hook.
//  * Eliminates duplicated toast state/logic across pages.
//  *
//  * Usage:
//  *   const { toast, showToast } = useToast()
//  *   showToast('Record saved!', 'success')
//  */
// import { useState, useCallback, useRef } from 'react'

// export default function useToast(duration = 3000) {
//   const [toast, setToast] = useState(null)
//   const timerRef = useRef(null)

//   const showToast = useCallback((message, type = 'success') => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast({ message, type })
//     timerRef.current = setTimeout(() => {
//       setToast(null)
//       timerRef.current = null
//     }, duration)
//   }, [duration])

//   const dismissToast = useCallback(() => {
//     if (timerRef.current) clearTimeout(timerRef.current)
//     setToast(null)
//   }, [])

//   return { toast, showToast, dismissToast }
// }
