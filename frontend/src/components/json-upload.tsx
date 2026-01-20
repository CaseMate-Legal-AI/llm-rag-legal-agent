import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function JsonUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // 각 단계 완료 상태
  const [isParsed, setIsParsed] = useState(false)
  const [isChunked, setIsChunked] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false)

  // 결과 메시지
  const [resultMessage, setResultMessage] = useState('')

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

  const handleParse = async () => {
    console.log(files.length)
    setIsLoading(true)
    setResultMessage('')

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('http://localhost:8000/api/embedding/parssing-json', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('파일 업로드 실패')
      }

      const result = await response.json()
      console.log('파싱 결과:', result)
      setResultMessage(result.message || '파싱 완료')
      setIsParsed(true)
      setIsChunked(false)
      setIsEmbedded(false)

    } catch (error) {
      console.error('에러:', error)
      setResultMessage('파일 업로드 중 에러가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChunking = async () => {
    setIsLoading(true)
    setResultMessage('')

    try {
      const response = await fetch('http://localhost:8000/api/embedding/chunking', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('청킹 실패')
      }

      const result = await response.json()
      console.log('청킹 결과:', result)
      setResultMessage(result.message || '청킹 완료')
      setIsChunked(true)
      setIsEmbedded(false)

    } catch (error) {
      console.error('에러:', error)
      setResultMessage('청킹 중 에러가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmbedding = async () => {
    setIsLoading(true)
    setResultMessage('')

    try {
      const response = await fetch('http://localhost:8000/api/embedding/embedding', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('임베딩 실패')
      }

      const result = await response.json()
      console.log('임베딩 결과:', result)
      setResultMessage(result.message || '임베딩 완료')
      setIsEmbedded(true)

    } catch (error) {
      console.error('에러:', error)
      setResultMessage('임베딩 중 에러가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
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

        <div className="mt-6 space-y-3">
          {/* 파싱 버튼 */}
          <div className="flex gap-3">
            <Button
              onClick={handleParse}
              disabled={files.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading && !isParsed ? '파싱 중...' : '파싱'}
            </Button>
            <Button
              onClick={() => {
                setFiles([])
                setIsParsed(false)
                setIsChunked(false)
                setIsEmbedded(false)
                setResultMessage('')
              }}
              variant="outline"
              disabled={files.length === 0 || isLoading}
            >
              초기화
            </Button>
          </div>

          {/* 청킹 버튼 - 파싱 완료 후 표시 */}
          {isParsed && (
            <Button
              onClick={handleChunking}
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading && isParsed && !isChunked ? '청킹 중...' : '청킹'}
            </Button>
          )}

          {/* 임베딩 버튼 - 청킹 완료 후 표시 */}
          {isChunked && (
            <Button
              onClick={handleEmbedding}
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading && isChunked && !isEmbedded ? '임베딩 중...' : '임베딩'}
            </Button>
          )}
        </div>

        {/* 결과 메시지 */}
        {resultMessage && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm">{resultMessage}</p>
            {isEmbedded && (
              <p className="text-sm text-green-600 font-semibold mt-2">
                ✓ 모든 처리가 완료되었습니다!
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
