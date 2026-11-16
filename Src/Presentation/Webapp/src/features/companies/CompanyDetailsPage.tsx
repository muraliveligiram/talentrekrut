import { Briefcase, Globe, Mail, Pencil, Phone } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailItem, DetailList } from '@/components/ui/detail-list'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/spinner'
import { formatDate } from '@/lib/utils'
import { useCompany } from './useCompanies'

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function CompanyDetailsPage() {
  const { id = '' } = useParams()
  const companyQuery = useCompany(id)

  if (companyQuery.isLoading) {
    return <PageLoader label="Loading company…" />
  }
  if (companyQuery.isError || !companyQuery.data) {
    return <Alert title="Unable to find this company">It may have been deleted.</Alert>
  }

  const company = companyQuery.data
  const address = [company.address, company.city, company.state, company.postalCode, company.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/companies', label: 'Companies' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={company.name} className="size-10 rounded-lg text-sm" />
            {company.name}
          </span>
        }
        description={
          <span className="flex items-center gap-2">
            <Badge tone={company.isActive ? 'success' : 'neutral'} dot>
              {company.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {company.industry && <span>{company.industry}</span>}
          </span>
        }
        actions={
          <>
            <ButtonLink to={`/jobs?companyId=${company.id}`} variant="outline">
              <Briefcase />
              View jobs
            </ButtonLink>
            <ButtonLink to={`/companies/${company.id}/edit`}>
              <Pencil />
              Edit
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label="About" wide>
                {company.about}
              </DetailItem>
              <DetailItem label="Website">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {company.website}
                  </a>
                )}
              </DetailItem>
              <DetailItem label="Added">{formatDate(company.createdAt)}</DetailItem>
              <DetailItem label="Address" wide>
                {address}
              </DetailItem>
            </DetailList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {company.contactPersonName || company.contactEmail || company.contactPhone ? (
              <>
                {company.contactPersonName && (
                  <div className="flex items-center gap-3">
                    <Avatar name={company.contactPersonName} />
                    <span className="font-medium">{company.contactPersonName}</span>
                  </div>
                )}
                {company.contactEmail && (
                  <a href={`mailto:${company.contactEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="size-4" />
                    {company.contactEmail}
                  </a>
                )}
                {company.contactPhone && (
                  <a href={`tel:${company.contactPhone}`} className="flex items-center gap-2 hover:underline">
                    <Phone className="size-4 text-muted" />
                    {company.contactPhone}
                  </a>
                )}
                {company.website && (
                  <span className="flex items-center gap-2 text-muted">
                    <Globe className="size-4" />
                    {hostname(company.website)}
                  </span>
                )}
              </>
            ) : (
              <p className="text-muted">No contact details yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
