import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function JsonUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.json')
    )

    setFiles(prevFiles => [...prevFiles, ...droppedFiles])
  }

  const handleParse = () => {
    console.log(files.length)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold mb-6">JSON 파일 업로드</h1>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">JSON 파일을 여기에 드래그하세요</p>
            <p className="text-sm">(.json 파일만 허용됩니다)</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">업로드된 파일 ({files.length}개)</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            onClick={handleParse}
            disabled={files.length === 0}
            className="flex-1"
          >
            파싱
          </Button>
          <Button
            onClick={() => setFiles([])}
            variant="outline"
            disabled={files.length === 0}
          >
            초기화
          </Button>
        </div>
      </Card>
    </div>
  )
}
