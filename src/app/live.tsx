// One event's live board: who is up next, how close my divers are, and Follow live, which keeps reading the
// board with the screen off and sends "Up next" alerts (src/live.tsx).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Text, View } from 'react-native';
import { parseLiveBoard, type LiveBoard } from '../divemeets/parsers';
import { usePage } from '../divemeets/source';
import { useFollows } from '../follows';
import { useLive } from '../live';
import { diversBefore } from '../scoring';
import { Body, Button, Card, Heading, MyDiverTag, Num, PageView, placeWords, points, Screen, styles, Title } from '../ui';

/** Android 13 and later ask the person before an app may send notifications. */
async function alertsAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  const answer = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return answer === PermissionsAndroid.RESULTS.GRANTED;
}

const diversWords = (k: number) => `${k} diver${k === 1 ? '' : 's'}`;

function howClose(board: LiveBoard, diverNumber: number): string {
  const k = diversBefore(board, diverNumber);
  if (k === 0) return 'Up next';
  if (typeof k === 'number') return `${diversWords(k)} before them`;
  if (k === 'dived') return 'Dived this round';
  return 'Waiting for the next round';
}

/** "Updated just now" or "Updated 40 seconds ago", ticking while the screen is open. */
function Updated({ at }: { at: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.round((now - at) / 1000));
  return <Body muted>{s < 5 ? 'Updated just now' : `Updated ${s} seconds ago`}</Body>;
}

export default function LiveScreen() {
  const { path } = useLocalSearchParams<{ path: string }>();
  const live = useLive();
  const { divers } = useFollows();
  const { state, reload } = usePage(path, parseLiveBoard);
  const following = live.path === path;
  const [alertsOff, setAlertsOff] = useState(false);

  // After the person opens DiveMeets' check here, live mode starts again once the page reads.
  const resumeAfterCheck = useRef(false);
  const { start } = live;
  useEffect(() => {
    if (resumeAfterCheck.current && state.status === 'ready') {
      resumeAfterCheck.current = false;
      start(path);
    }
  }, [state.status, start, path]);

  const followLive = async () => {
    setAlertsOff(!(await alertsAllowed()));
    live.start(path);
  };
  const openCheck = () => {
    resumeAfterCheck.current = true;
    live.stop();
    reload();
  };

  const draw = (board: LiveBoard) => {
    const mine = divers.filter((d) => board.rows.some((r) => r.diverNumber === d.diverNumber));
    const isMine = (n: number) => mine.some((d) => d.diverNumber === n);
    const toDive = board.rows.filter((r) => r.toDive).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    const standings = [...board.rows].sort((a, b) => (a.place ?? 999) - (b.place ?? 999));

    return (
      <>
        <Title>{board.eventName}</Title>
        {board.stage && <Body muted>{board.stage}</Body>}
        {board.round && <Num>{`Round ${board.round.current} of ${board.round.total}`}</Num>}
        {following && live.updatedAt !== undefined && <Updated at={live.updatedAt} />}

        {board.closed ? (
          <Body>This event is over.</Body>
        ) : (
          <View style={styles.block}>
            {following ? (
              <Button label="Stop following live" onPress={live.stop} />
            ) : (
              <>
                <Button label="Follow live" filled onPress={followLive} />
                <Body muted>Keeps checking the board with your screen off, and alerts you before your diver is up.</Body>
                <Button label="Check again" onPress={reload} />
              </>
            )}
            {alertsOff && (
              <Text style={styles.errorText}>
                Alerts are off. Turn on notifications for DiveData in your phone&apos;s settings.
              </Text>
            )}
            {following && live.error?.name === 'CheckNeededError' && (
              <>
                <Text style={styles.errorText}>DiveMeets wants to check you&apos;re a person.</Text>
                <Button label="Open DiveMeets' check" filled onPress={openCheck} />
              </>
            )}
            {following && live.error && live.error.name !== 'CheckNeededError' && (
              <Text style={styles.errorText}>Couldn&apos;t reach DiveMeets. Trying again.</Text>
            )}
            <Body>Alert me when my diver is this many divers away:</Body>
            <View style={styles.row}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  label={`Alert me ${diversWords(n)} away`}
                  text={String(n)}
                  selected={live.away === n}
                  onPress={() => live.setAway(n)}
                />
              ))}
            </View>
          </View>
        )}

        {board.next && <Heading>{`Up next: ${board.next.name}`}</Heading>}

        {mine.map((d) => {
          const row = board.rows.find((r) => r.diverNumber === d.diverNumber);
          return (
            <Card
              key={d.diverNumber}
              label={`Open ${d.name}`}
              highlight
              onPress={() =>
                router.push({ pathname: '/diver/[diverNumber]', params: { diverNumber: String(d.diverNumber) } })
              }
            >
              <MyDiverTag />
              <Body>{d.name}</Body>
              {!board.closed && <Body>{howClose(board, d.diverNumber)}</Body>}
              <Num>{`Place ${placeWords({ place: row?.place })} · Total ${points(row?.total)}`}</Num>
            </Card>
          );
        })}

        {!board.closed && toDive.length > 0 && (
          <>
            <Heading>Still to dive this round</Heading>
            {toDive.map((r) => (
              <View key={r.diverNumber} style={styles.row}>
                <Num>{r.order ?? '–'}</Num>
                <Body>{r.name}</Body>
                {isMine(r.diverNumber) && <MyDiverTag />}
              </View>
            ))}
          </>
        )}

        <Heading>Standings</Heading>
        {standings.map((r) => (
          <View key={r.diverNumber} style={styles.spread}>
            <View style={styles.row}>
              <Num>{r.place ?? '–'}</Num>
              <Body>{r.name}</Body>
              {isMine(r.diverNumber) && <MyDiverTag />}
            </View>
            <Num>{points(r.total)}</Num>
          </View>
        ))}
      </>
    );
  };

  return (
    <Screen title="Live board">
      {following && live.board ? draw(live.board) : <PageView state={state} reload={reload}>{draw}</PageView>}
    </Screen>
  );
}
