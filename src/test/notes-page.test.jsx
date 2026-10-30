import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../native-notifications',()=>({isNative:()=>false,openNoteLink:vi.fn()}));
import NotesPage,{NoteText} from '../components/NotesPage';
const note={id:'n',type:'note',noteType:'link',title:'Saved reel',source:'Instagram',body:'Try this later',url:'https://www.instagram.com/reel/123/',tags:['fitness'],createdAt:100,updatedAt:100};
const props=()=>({records:{n:note},save:vi.fn(),remove:vi.fn(),notify:vi.fn(),uid:'local',status:'Saved on this device',onBack:vi.fn()});
it('opens shared notes with clickable external links and filters sources',async()=>{
  const user=userEvent.setup();render(<NotesPage {...props()}/>);await user.click(screen.getByRole('button',{name:'Saved reel',exact:true}));
  expect(screen.getByRole('link',{name:/https:\/\/www.instagram.com\/reel/}).getAttribute('href')).toBe(note.url);
  expect(screen.queryByText(/Preview share flow/)).toBeNull();
});
it('creates a text note without requiring a share receiver on the website',async()=>{
  const user=userEvent.setup(),p=props();render(<NotesPage {...p}/>);await user.click(screen.getByRole('button',{name:'+ New note'}));await user.type(screen.getByLabelText('Title'),'An idea');await user.type(screen.getByLabelText('Your note'),'Remember this');await user.click(screen.getByRole('button',{name:'Save note'}));expect(p.save).toHaveBeenCalledWith(expect.objectContaining({type:'note',title:'An idea',noteType:'text',body:'Remember this'}));
});
it('renders URLs inside note text as links rather than executable content',()=>{
  render(<NoteText text={'See https://example.com/item. javascript:alert(1)'}/>);expect(screen.getByRole('link').getAttribute('href')).toBe('https://example.com/item');expect(screen.getAllByRole('link')).toHaveLength(1);
});
