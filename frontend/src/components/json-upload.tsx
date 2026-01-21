import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function JsonUpload() {
  // 각 단계 완료 상태
  const [isParsed, setIsParsed] = useState(false)
  const [isChunked, setIsChunked] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false)

  // 결과 메시지
  const [resultMessage, setResultMessage] = useState('')

  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleParse = async () => {
    setIsLoading(true)
    setResultMessage('')

    try {
      const response = await fetch('http://localhost:8000/api/embedding/parse-sample-directory', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('샘플 파일 파싱 실패')
      }

      const result = await response.json()
      console.log('파싱 결과:', result)
      setResultMessage(result.message || '파싱 완료')
      setIsParsed(true)
      setIsChunked(false)
      setIsEmbedded(false)

    } catch (error) {
      console.error('에러:', error)
      setResultMessage('샘플 파일 파싱 중 에러가 발생했습니다.')
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
      console.log('handleEmbedding response:', response)
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

  const handleClearDB = async () => {
    if (!window.confirm('벡터 DB의 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    setIsLoading(true)
    setResultMessage('')

    try {
      const response = await fetch('http://localhost:8000/api/embedding/clear-db', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('DB 초기화 실패')
      }

      const result = await response.json()
      console.log('DB 초기화 결과:', result)
      setResultMessage(result.message || 'DB 초기화 완료')
      setIsParsed(false)
      setIsChunked(false)
      setIsEmbedded(false)

    } catch (error) {
      console.error('에러:', error)
      setResultMessage('DB 초기화 중 에러가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResult('검색어를 입력해주세요.')
      return
    }

    setIsSearching(true)
    setSearchResult('')

    try {
      const response = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (!response.ok) {
        throw new Error('검색 실패')
      }

      const result = await response.json()
      console.log('검색 결과:', result)
      setSearchResult(result.result || '검색 결과가 없습니다.')

    } catch (error) {
      console.error('에러:', error)
      setSearchResult('검색 중 에러가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold mb-6">샘플 데이터 파싱</h1>

        <div className="border-2 border-dashed rounded-lg p-12 text-center bg-muted/50">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">샘플 데이터 파일 파싱</p>
            <p className="text-sm">/src/sample/pan 디렉토리의 JSON 파일들을 파싱합니다</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {/* 파싱 버튼 */}
          <div className="flex gap-3">
            <Button
              onClick={handleParse}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && !isParsed ? '파싱 중...' : '파싱'}
            </Button>
            <Button
              onClick={() => {
                setIsParsed(false)
                setIsChunked(false)
                setIsEmbedded(false)
                setResultMessage('')
              }}
              variant="outline"
              disabled={isLoading}
            >
              초기화
            </Button>
          </div>

          {/* DB 초기화 버튼 */}
          <Button
            onClick={handleClearDB}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            벡터 DB 초기화
          </Button>

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

        {/* 검색 영역 */}
        <div className="mt-8 pt-8 border-t border-border">
          <h2 className="text-xl font-bold mb-4">판례 검색</h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="검색어를 입력하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isSearching) {
                    handleSearch()
                  }
                }}
                disabled={isSearching}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? '검색 중...' : '전송'}
              </Button>
            </div>

            {/* 검색 결과 */}
            {searchResult && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-semibold mb-2">검색 결과:</h3>
                <p className="text-sm whitespace-pre-wrap">{searchResult}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
