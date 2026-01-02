'use client'

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage: number
  totalItems: number
  showingStart: number
  showingEnd: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  showingStart,
  showingEnd,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
      <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        Showing {showingStart} to {showingEnd} of {totalItems} results
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: currentPage === 1 ? 'var(--button-secondary-bg)' : 'var(--button-secondary-bg)',
            color: currentPage === 1 ? 'var(--foreground-secondary)' : 'var(--button-secondary-text)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
            }
          }}
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-sm"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition min-w-[2.5rem]"
                style={{
                  backgroundColor: isActive ? 'var(--accent)' : 'var(--button-secondary-bg)',
                  color: isActive ? 'var(--accent-text)' : 'var(--button-secondary-text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                  }
                }}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: currentPage === totalPages ? 'var(--button-secondary-bg)' : 'var(--button-secondary-bg)',
            color: currentPage === totalPages ? 'var(--foreground-secondary)' : 'var(--button-secondary-text)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
            }
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}

