import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { KANBAN_COLUMNS, scoreColor } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function ProspectKanban({ prospects, onOpenDetail }) {
  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.entities.Prospect.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
  });

  const byColumn = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, prospects.filter((p) => (p.status || 'new') === c.id)]));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    if (destination.droppableId === result.source.droppableId) return;
    statusMutation.mutate({ id: draggableId, status: destination.droppableId });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {KANBAN_COLUMNS.map((col) => (
          <Droppable key={col.id} droppableId={col.id}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="rounded-sm border border-border bg-card/60 p-2 min-h-[16rem]">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 pb-2 flex justify-between">
                  {col.label}
                  <span>{byColumn[col.id].length}</span>
                </div>
                <div className="space-y-1.5">
                  {byColumn[col.id].map((p, index) => (
                    <Draggable key={p.id} draggableId={p.id} index={index}>
                      {(dragProvided) => (
                        <button
                          type="button"
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onOpenDetail(p)}
                          className="w-full text-left rounded-sm border border-border bg-card px-2.5 py-2 hover:border-primary/50"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: scoreColor(p.ai_score) }} />
                            <span className="text-xs font-medium truncate">{p.name}</span>
                          </div>
                          <div className={cn('font-mono text-[10px] text-muted-foreground truncate')}>{p.facility_type}</div>
                        </button>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
