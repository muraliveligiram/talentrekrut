CREATE TABLE [dbo].[Companies]
(
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [Industry] NVARCHAR(100) NULL,
    [Website] NVARCHAR(300) NULL,
    [About] NVARCHAR(MAX) NULL,
    [Address] NVARCHAR(300) NULL,
    [City] NVARCHAR(100) NULL,
    [State] NVARCHAR(100) NULL,
    [Country] NVARCHAR(100) NULL,
    [PostalCode] NVARCHAR(30) NULL,
    [ContactPersonName] NVARCHAR(200) NULL,
    [ContactEmail] NVARCHAR(200) NULL,
    [ContactPhone] NVARCHAR(30) NULL,
    [LogoPath] NVARCHAR(500) NULL,
    [IsActive] BIT NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedAt] DATETIMEOFFSET NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL,
    CONSTRAINT [PK_Companies] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_Companies_Name]
    ON [dbo].[Companies] ([Name] ASC);
GO
