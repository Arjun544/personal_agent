export class GenerationControlService {
    private static stopSignals: Map<string, boolean> = new Map();

    static signalStop(conversationId: string) {
        this.stopSignals.set(conversationId, true);
    }

    static shouldStop(conversationId: string): boolean {
        return this.stopSignals.get(conversationId) || false;
    }

    static clearSignal(conversationId: string) {
        this.stopSignals.delete(conversationId);
    }
}
