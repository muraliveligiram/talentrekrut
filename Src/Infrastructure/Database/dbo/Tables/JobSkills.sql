CREATE TABLE [dbo].[JobSkills]
(
    [Id] bigint IDENTITY(1,1)  NOT NULL,
    [JobId] bigint NOT NULL,
    [SkillName] NVARCHAR(100) NOT NULL,
    [SkillType] INT NOT NULL,
    [MinYears] DECIMAL(18, 2) NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedAt] DATETIMEOFFSET NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL,
    CONSTRAINT [PK_JobSkills] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_JobSkills_Jobs_JobId]
        FOREIGN KEY ([JobId]) REFERENCES [dbo].[Jobs] ([Id]) ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX [IX_JobSkills_JobId]
    ON [dbo].[JobSkills] ([JobId] ASC);
GO
