CREATE TABLE [dbo].[Jobs]
(
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [JobCode] NVARCHAR(30) NOT NULL,
    [CompanyId] bigint NOT NULL,
    [Title] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [MinExperienceYears] DECIMAL(18, 2) NOT NULL,
    [MaxExperienceYears] DECIMAL(18, 2) NOT NULL,
    [Openings] INT NOT NULL,
    [Location] NVARCHAR(200) NULL,
    [EmploymentType] INT NOT NULL,
    [WorkMode] INT NOT NULL,
    [CommunicationRequirement] NVARCHAR(500) NULL,
    [Status] INT NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedAt] DATETIMEOFFSET NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL,
    CONSTRAINT [PK_Jobs] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Jobs_Companies_CompanyId]
        FOREIGN KEY ([CompanyId]) REFERENCES [dbo].[Companies] ([Id])
);
GO

CREATE NONCLUSTERED INDEX [IX_Jobs_CompanyId]
    ON [dbo].[Jobs] ([CompanyId] ASC);
GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_Jobs_JobCode]
    ON [dbo].[Jobs] ([JobCode] ASC);
GO
