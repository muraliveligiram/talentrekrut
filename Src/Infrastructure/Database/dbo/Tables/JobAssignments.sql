CREATE TABLE [dbo].[JobAssignments]
(
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [JobId] bigint NOT NULL,
    [RecruiterUserId] bigint NOT NULL,
    [AssignedAt] DATETIMEOFFSET NOT NULL,
    [AssignedBy] bigint NOT NULL,
    [IsActive] BIT NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedAt] DATETIMEOFFSET NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL,
    CONSTRAINT [PK_JobAssignments] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_JobAssignments_Jobs_JobId]
        FOREIGN KEY ([JobId]) REFERENCES [dbo].[Jobs] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_JobAssignments_Users_RecruiterUserId]
        FOREIGN KEY ([RecruiterUserId]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE NONCLUSTERED INDEX [IX_JobAssignments_RecruiterUserId]
    ON [dbo].[JobAssignments] ([RecruiterUserId] ASC);
GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_JobAssignments_JobId_RecruiterUserId]
    ON [dbo].[JobAssignments] ([JobId] ASC, [RecruiterUserId] ASC)
    WHERE [IsActive] = 1;
GO
