CREATE TABLE [dbo].[Users]
(
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [Email] NVARCHAR(200) NOT NULL,
    [NormalizedEmail] NVARCHAR(200) NOT NULL,
    [FullName] NVARCHAR(200) NOT NULL,
    [PasswordHash] NVARCHAR(500) NOT NULL,
    [IsActive] BIT NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedAt] DATETIMEOFFSET NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_Users_NormalizedEmail]
    ON [dbo].[Users] ([NormalizedEmail] ASC);
GO
