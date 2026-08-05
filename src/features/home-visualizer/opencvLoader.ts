type OpenCv = Record<string, any>

let openCvPromise: Promise<OpenCv> | null = null

export function loadOpenCv() {
  if (!openCvPromise) {
    openCvPromise = import('@techstark/opencv-js').then(async (module) => {
      const candidate = (module as any).default ?? module
      const cv = candidate instanceof Promise ? await candidate : candidate
      if (cv.Mat) return cv as OpenCv
      await new Promise<void>((resolve) => { cv.onRuntimeInitialized = resolve })
      return cv as OpenCv
    })
  }
  return openCvPromise
}
