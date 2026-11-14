CREATE TABLE [dbo].[Roles]
(
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(50) NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedAt] DATETIMEOFFSET NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_Roles_Name]
    ON [dbo].[Roles] ([Name] ASC);
GO
