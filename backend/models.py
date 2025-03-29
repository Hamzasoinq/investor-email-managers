from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

# Association tables for many-to-many relationships
email_tags = Table(
    'email_tags',
    Base.metadata,
    Column('email_id', Integer, ForeignKey('emails.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

contact_tags = Table(
    'contact_tags',
    Base.metadata,
    Column('contact_id', Integer, ForeignKey('contacts.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    emailbison_id = Column(String, unique=True)
    subject = Column(String)
    body = Column(String)
    sender_email = Column(String)
    recipient_email = Column(String)
    status = Column(String)  # inbox, sent, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tags = relationship("Tag", secondary=email_tags, back_populates="emails")
    contact = relationship("Contact", back_populates="emails")

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    company = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    emails = relationship("Email", back_populates="contact")
    tags = relationship("Tag", secondary=contact_tags, back_populates="contacts")
    sequences = relationship("Sequence", back_populates="contact")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    emails = relationship("Email", secondary=email_tags, back_populates="tags")
    contacts = relationship("Contact", secondary=contact_tags, back_populates="tags")

class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    contact = relationship("Contact", back_populates="sequences")
    steps = relationship("SequenceStep", back_populates="sequence")

class SequenceStep(Base):
    __tablename__ = "sequence_steps"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id"))
    delay_days = Column(Integer)  # Days to wait before sending this step
    subject = Column(String)
    body = Column(String)
    order = Column(Integer)
    
    # Relationships
    sequence = relationship("Sequence", back_populates="steps") 